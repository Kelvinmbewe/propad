import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdvertiserBalanceService } from './advertiser-balance.service';
import { AuditService } from '../audit/audit.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { TrackClickDto } from './dto/track-click.dto';
import { Role } from '@propad/config';

interface AuthContext {
  userId: string;
  role: Role;
  email?: string | null;
}

@Injectable()
export class AdsService {
  constructor(
    private prisma: PrismaService,
    private balanceService: AdvertiserBalanceService,
    private audit: AuditService,
  ) { }

  // ========== EXISTING METHODS ==========

  async getActiveCampaigns() {
    return this.prisma.adCampaign.findMany({
      where: { status: 'ACTIVE' },
      include: {
        flights: {
          include: {
            creative: true,
            placement: true,
          },
        },
      },
    });
  }

  async getCampaignStats(campaignId: string) {
    return this.prisma.adStat.findMany({
      where: { campaignId },
    });
  }

  async ingestDailyRevenue(date: Date, grossUsdCents: number) {
    const dateKey = new Date(date);
    dateKey.setUTCHours(0, 0, 0, 0);

    return this.prisma.metricDailyRevenue.upsert({
      where: { date: dateKey },
      update: {
        grossUsdCents: { increment: grossUsdCents },
      },
      create: {
        date: dateKey,
        grossUsdCents: grossUsdCents,
        payoutsUsdCents: 0,
      },
    });
  }

  async aggregateInHouseRevenue(date: Date) {
    const dateKey = new Date(date);
    dateKey.setUTCHours(0, 0, 0, 0);
    const nextDay = new Date(dateKey);
    nextDay.setDate(nextDay.getDate() + 1);

    const match = await this.prisma.adImpression.aggregate({
      where: {
        createdAt: {
          gte: dateKey,
          lt: nextDay,
        },
      },
      _sum: {
        revenueMicros: true,
      },
    });

    const revenueMicros = match._sum.revenueMicros || 0;
    const revenueCents = Math.floor(revenueMicros / 10000);

    if (revenueCents > 0) {
      await this.ingestDailyRevenue(dateKey, revenueCents);
    }

    return { date: dateKey, revenueCents };
  }

  // ========== CAMPAIGN CRUD ==========

  private async getAdvertiserIdForUser(user: AuthContext): Promise<string | null> {
    if (!user.email) return null;
    const advertiser = await this.prisma.advertiser.findFirst({
      where: { contactEmail: user.email },
    });
    return advertiser?.id ?? null;
  }

  async createCampaign(dto: CreateCampaignDto, user: AuthContext) {
    // Get or create advertiser for user
    let advertiserId = await this.getAdvertiserIdForUser(user);

    if (!advertiserId) {
      // Create advertiser for this user
      const advertiser = await this.prisma.advertiser.create({
        data: {
          name: user.email || 'Unknown',
          contactEmail: user.email,
          status: 'ACTIVE',
        },
      });
      advertiserId = advertiser.id;
    }

    // Validate PROPERTY_BOOST has targetPropertyId
    if (dto.type === 'PROPERTY_BOOST' && !dto.targetPropertyId) {
      throw new BadRequestException('PROPERTY_BOOST campaigns require targetPropertyId');
    }

    // Validate property ownership for PROPERTY_BOOST
    if (dto.targetPropertyId) {
      const property = await this.prisma.property.findUnique({
        where: { id: dto.targetPropertyId },
      });
      if (!property) {
        throw new NotFoundException('Target property not found');
      }
      // Allow owner or admin
      const isOwner = property.landlordId === user.userId || property.agentOwnerId === user.userId;
      if (!isOwner && user.role !== Role.ADMIN) {
        throw new ForbiddenException('You do not own this property');
      }
    }

    const campaign = await this.prisma.adCampaign.create({
      data: {
        advertiserId,
        name: dto.name,
        type: dto.type as any,
        targetPropertyId: dto.targetPropertyId,
        budgetCents: dto.budgetCents,
        dailyCapCents: dto.dailyCapCents,
        dailyCapImpressions: dto.dailyCapImpressions,
        startAt: new Date(dto.startAt),
        endAt: dto.endAt ? new Date(dto.endAt) : null,
        cpmUsdCents: dto.cpmUsdCents,
        cpcUsdCents: dto.cpcUsdCents,
        targetingJson: dto.targetingJson ?? null,
        status: 'DRAFT',
      },
      include: {
        advertiser: true,
        targetProperty: true,
      },
    });

    await this.audit.logAction({
      action: 'ads.campaign.create',
      actorId: user.userId,
      targetType: 'adCampaign',
      targetId: campaign.id,
      metadata: { type: dto.type, name: dto.name },
    });

    return campaign;
  }

  async getMyCampaigns(user: AuthContext) {
    const advertiserId = await this.getAdvertiserIdForUser(user);

    // Admins can see all campaigns
    if (user.role === Role.ADMIN) {
      return this.prisma.adCampaign.findMany({
        include: {
          advertiser: true,
          targetProperty: { select: { id: true, title: true } },
          stats: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
    }

    if (!advertiserId) {
      return [];
    }

    return this.prisma.adCampaign.findMany({
      where: { advertiserId },
      include: {
        advertiser: true,
        targetProperty: { select: { id: true, title: true } },
        stats: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCampaignById(id: string, user: AuthContext) {
    const campaign = await this.prisma.adCampaign.findUnique({
      where: { id },
      include: {
        advertiser: true,
        targetProperty: true,
        stats: true,
        flights: {
          include: { creative: true, placement: true },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // Check access
    await this.assertCampaignAccess(campaign, user);

    return campaign;
  }

  async updateCampaign(id: string, dto: UpdateCampaignDto, user: AuthContext) {
    const campaign = await this.prisma.adCampaign.findUnique({
      where: { id },
      include: { advertiser: true },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    await this.assertCampaignAccess(campaign, user);

    // Prevent activating with zero balance
    if (dto.status === 'ACTIVE' && campaign.status !== 'ACTIVE') {
      const canAfford = await this.balanceService.canAfford(
        campaign.advertiserId,
        dto.dailyCapCents ?? campaign.dailyCapCents ?? 100,
      );
      if (!canAfford) {
        throw new BadRequestException('Cannot activate campaign with insufficient balance');
      }
    }

    const updated = await this.prisma.adCampaign.update({
      where: { id },
      data: {
        name: dto.name,
        budgetCents: dto.budgetCents,
        dailyCapCents: dto.dailyCapCents,
        dailyCapImpressions: dto.dailyCapImpressions,
        endAt: dto.endAt !== undefined ? (dto.endAt ? new Date(dto.endAt) : null) : undefined,
        cpmUsdCents: dto.cpmUsdCents,
        cpcUsdCents: dto.cpcUsdCents,
        targetingJson: dto.targetingJson ?? undefined,
        status: dto.status as any,
      },
      include: { advertiser: true, targetProperty: true },
    });

    await this.audit.logAction({
      action: 'ads.campaign.update',
      actorId: user.userId,
      targetType: 'adCampaign',
      targetId: id,
      metadata: dto,
    });

    return updated;
  }

  async pauseCampaign(id: string, user: AuthContext) {
    return this.updateCampaign(id, { status: 'PAUSED' }, user);
  }

  async resumeCampaign(id: string, user: AuthContext) {
    const campaign = await this.prisma.adCampaign.findUnique({
      where: { id },
      include: { advertiser: true },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // Check balance before allowing resume
    const canAfford = await this.balanceService.canAfford(
      campaign.advertiserId,
      campaign.dailyCapCents ?? 100,
    );
    if (!canAfford) {
      throw new BadRequestException('Cannot resume campaign with insufficient balance');
    }

    return this.updateCampaign(id, { status: 'ACTIVE' }, user);
  }

  // ========== BALANCE MANAGEMENT ==========

  async topUp(advertiserId: string, amountCents: number, user: AuthContext) {
    // Verify access to advertiser
    const advertiser = await this.prisma.advertiser.findUnique({
      where: { id: advertiserId },
    });

    if (!advertiser) {
      throw new NotFoundException('Advertiser not found');
    }

    // Check ownership or admin
    const userAdvertiserId = await this.getAdvertiserIdForUser(user);
    if (userAdvertiserId !== advertiserId && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Cannot top up this advertiser account');
    }

    return this.balanceService.topUp(advertiserId, amountCents, user.userId);
  }

  async getAdvertiserBalance(user: AuthContext) {
    const advertiserId = await this.getAdvertiserIdForUser(user);
    if (!advertiserId) {
      return { balanceCents: 0 };
    }
    return this.balanceService.getBalance(advertiserId);
  }

  // ========== TRACKING ==========

  async trackImpression(dto: {
    campaignId: string;
    flightId?: string;
    placementId?: string;
    propertyId?: string;
    sessionId: string;
    route: string;
    userId?: string;
  }) {
    const campaign = await this.prisma.adCampaign.findUnique({
      where: { id: dto.campaignId },
      include: { advertiser: true },
    });

    if (!campaign || campaign.status !== 'ACTIVE') {
      return { success: false, reason: 'Campaign not active' };
    }

    const cpmMicros = (campaign.cpmUsdCents ?? 0) * 10;
    const costMicros = Math.ceil(cpmMicros / 1000); // Cost per impression

    // Deduct from balance
    const deductResult = await this.balanceService.deductImpression(
      campaign.advertiserId,
      campaign.id,
      costMicros,
    );

    if (!deductResult.success) {
      return { success: false, reason: 'Insufficient balance' };
    }

    // Record impression
    const impression = await this.prisma.adImpression.create({
      data: {
        campaignId: dto.campaignId,
        flightId: dto.flightId,
        placementId: dto.placementId,
        propertyId: dto.propertyId,
        userId: dto.userId,
        sessionId: dto.sessionId,
        route: dto.route,
        revenueMicros: costMicros,
        advertiserId: campaign.advertiserId,
      },
    });

    return { success: true, impressionId: impression.id };
  }

  async trackClick(dto: TrackClickDto, userId?: string) {
    const campaign = await this.prisma.adCampaign.findUnique({
      where: { id: dto.campaignId },
      include: { advertiser: true },
    });

    if (!campaign || campaign.status !== 'ACTIVE') {
      return { success: false, reason: 'Campaign not active' };
    }

    const cpcMicros = (campaign.cpcUsdCents ?? 0) * 10000;

    // Deduct from balance
    const deductResult = await this.balanceService.deductClick(
      campaign.advertiserId,
      campaign.id,
      cpcMicros,
    );

    if (!deductResult.success) {
      return { success: false, reason: 'Insufficient balance' };
    }

    // Record click
    const click = await this.prisma.adClick.create({
      data: {
        campaignId: dto.campaignId,
        flightId: dto.flightId,
        placementId: dto.placementId,
        propertyId: dto.propertyId,
        userId,
        sessionId: dto.sessionId,
        clickUrl: dto.clickUrl,
        costMicros: cpcMicros,
      },
    });

    return { success: true, clickId: click.id };
  }

  // ========== PROMOTED LISTINGS ==========

  async getPromotedListings(params?: {
    cityId?: string;
    suburbId?: string;
    type?: string;
    limit?: number;
  }) {
    const now = new Date();
    const limit = params?.limit ?? 5;

    // Get active PROPERTY_BOOST and SEARCH_SPONSOR campaigns
    const campaigns = await this.prisma.adCampaign.findMany({
      where: {
        status: 'ACTIVE',
        type: { in: ['PROPERTY_BOOST', 'SEARCH_SPONSOR'] },
        startAt: { lte: now },
        OR: [
          { endAt: null },
          { endAt: { gte: now } },
        ],
        advertiser: {
          balanceCents: { gt: 0 },
        },
      },
      include: {
        targetProperty: {
          include: {
            city: true,
            suburb: true,
            media: { take: 1, orderBy: { order: 'asc' } },
          },
        },
        advertiser: { select: { balanceCents: true } },
      },
      orderBy: [
        { dailyCapCents: 'desc' }, // Higher budget first
        { createdAt: 'asc' },
      ],
      take: limit * 2, // Get extra to filter
    });

    // Filter by location if specified
    const filtered = campaigns.filter((c) => {
      if (!c.targetProperty) return false;
      if (params?.cityId && c.targetProperty.cityId !== params.cityId) return false;
      if (params?.suburbId && c.targetProperty.suburbId !== params.suburbId) return false;
      if (params?.type && c.targetProperty.type !== params.type) return false;
      return true;
    });

    // Get unique properties with promoted flag
    const properties = filtered
      .slice(0, limit)
      .filter((c) => c.targetProperty)
      .map((c) => ({
        ...c.targetProperty,
        isPromoted: true,
        campaignId: c.id,
      }));

    return properties;
  }

  // ========== ANALYTICS ==========

  async getCampaignAnalytics(campaignId: string, user: AuthContext) {
    const campaign = await this.getCampaignById(campaignId, user);

    // Get aggregated stats
    const [impressions, clicks, stats] = await Promise.all([
      this.prisma.adImpression.count({ where: { campaignId } }),
      this.prisma.adClick.count({ where: { campaignId } }),
      this.prisma.adStat.aggregate({
        where: { campaignId },
        _sum: {
          impressions: true,
          clicks: true,
          revenueMicros: true,
        },
      }),
    ]);

    const totalClicks = clicks + (stats._sum.clicks ?? 0);
    const totalImpressions = impressions + (stats._sum.impressions ?? 0);
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    return {
      campaign,
      analytics: {
        impressions: totalImpressions,
        clicks: totalClicks,
        ctr: parseFloat(ctr.toFixed(2)),
        spentCents: campaign.spentCents,
        budgetCents: campaign.budgetCents,
        remainingBudget: campaign.budgetCents
          ? campaign.budgetCents - campaign.spentCents
          : null,
      },
    };
  }

  // ========== HELPERS ==========

  private async assertCampaignAccess(
    campaign: { advertiserId: string; advertiser?: { contactEmail?: string | null } },
    user: AuthContext,
  ) {
    if (user.role === Role.ADMIN) return;

    const userAdvertiserId = await this.getAdvertiserIdForUser(user);
    if (userAdvertiserId !== campaign.advertiserId) {
      throw new ForbiddenException('You do not have access to this campaign');
    }
  }
}
