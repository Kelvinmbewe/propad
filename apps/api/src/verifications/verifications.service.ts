import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import {
  PropertyStatus,
  VerificationResult,
  VerificationItemStatus,
  VerificationStatus,
  VerificationRequestItem,
  VerificationType,
  Property,
  VerificationRequest,
  Prisma
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ReviewVerificationDto } from './dto/review-verification.dto';
import { ReviewVerificationItemDto } from '../properties/dto/review-verification-item.dto';

interface AuthContext {
  userId: string;
}

import { TrustService } from '../trust/trust.service';
import { RiskService, RiskSignalType } from '../trust/risk.service';

type VerificationRow = {
  id: string;
  targetType: 'PROPERTY' | 'USER' | 'COMPANY';
  targetUserId?: string | null;
  agencyId?: string | null;
  propertyId?: string | null;
  status: string;
  createdAt: Date;
  items: { id: string }[];
  property?: {
    id: string;
    title: string;
    listingPayments: { status: string }[];
  } | null;
  requester?: {
    id: string;
    name?: string | null;
    email?: string | null;
  } | null;
};

type UserLite = {
  id: string;
  name?: string | null;
  email?: string | null;
};

type AgencyLite = {
  id: string;
  name?: string | null;
};

@Injectable()
export class VerificationsService {
  private readonly logger = new Logger(VerificationsService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly trust: TrustService,
    private readonly riskService: RiskService
  ) { }

  async getVerificationQueue() {
    try {
      // PRODUCTION HARDENING: Only show requests with at least ONE SUBMITTED item
      // A VerificationRequest ONLY appears in the admin queue IF it has at least ONE VerificationItem with status === 'SUBMITTED'
      // Requests with only PENDING / APPROVED / REJECTED items MUST NOT appear
      const rawRequests = await this.prisma.verificationRequest.findMany({
        where: {
          status: 'PENDING', // Only PENDING requests are in the queue
          items: {
            some: {
              status: 'SUBMITTED' // MUST have at least one SUBMITTED item
            }
          }
        },
        include: {
          items: {
            where: {
              status: 'SUBMITTED' // Only count SUBMITTED items for queue display
            }
          },
          property: {
            select: { id: true, title: true, listingPayments: true }
          },
          requester: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: 'asc' }
      });

      // PROOF: Log request count before returning
      const requestCount = rawRequests.length;
      console.log(`VERIFICATION REQUESTS FOUND: ${requestCount}`);
      
      this.logger.log(
        `[VERIFICATION QUEUE] Found ${requestCount} requests with SUBMITTED items`,
        rawRequests.map((r: any) => ({
          id: r.id,
          status: r.status,
          submittedItemsCount: r.items.length
        }))
      );

      // Cast to strict local type to ensure safety in callbacks
      const requests = rawRequests as unknown as VerificationRow[];

      // 2. Collect Missing IDs (User & Company)
      const userIds = requests
        .filter((r: VerificationRow) => r.targetType === 'USER' && r.targetUserId)
        .map((r: VerificationRow) => r.targetUserId!);

      const agencyIds = requests
        .filter((r: VerificationRow) => r.targetType === 'COMPANY' && r.agencyId)
        .map((r: VerificationRow) => r.agencyId!);

      // 3. Fetch Related Entities
      const [users, agencies] = await Promise.all([
        userIds.length ? this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true }
        }) : [],
        agencyIds.length ? this.prisma.agency.findMany({
          where: { id: { in: agencyIds } },
          select: { id: true, name: true }
        }) : []
      ]);

      const userMap: Record<string, UserLite> = {};
      users.forEach((u: UserLite) => { userMap[u.id] = u; });

      const agencyMap: Record<string, AgencyLite> = {};
      agencies.forEach((a: AgencyLite) => { agencyMap[a.id] = a; });

      // 4. Normalize & Map
      const queue = requests.map((req: VerificationRow) => {
        let targetLabel = 'Unknown Target';
        let targetId = '';

        // Resolve IDs
        if (req.targetType === 'PROPERTY') {
          targetId = req.propertyId || '';
        } else if (req.targetType === 'USER') {
          targetId = req.targetUserId || '';
        } else if (req.targetType === 'COMPANY') {
          targetId = req.agencyId || '';
        }

        // Resolve Labels
        if (req.targetType === 'PROPERTY') {
          targetLabel = req.property ? req.property.title : 'Deleted Property';
        } else if (req.targetType === 'USER' && req.targetUserId) {
          const u = userMap[req.targetUserId];
          targetLabel = u?.name || u?.email || 'Unnamed User';
        } else if (req.targetType === 'COMPANY' && req.agencyId) {
          const a = agencyMap[req.agencyId];
          targetLabel = a ? (a.name || 'Unnamed Agency') : 'Unknown Agency';
        }

        // Paid Logic (Property Only)
        const isPaid = !!req.property?.listingPayments?.some((p) => p.status === 'PAID');

        return {
          id: req.id,
          targetType: req.targetType,
          targetId: targetId,
          targetLabel: targetLabel,
          status: req.status,
          createdAt: req.createdAt,
          isPaid: isPaid,
          itemsCount: req.items.length, // Count of SUBMITTED items only
          requesterName: req.requester?.name || req.requester?.email || 'System'
        };
      });

      // 5. Sort: Paid > Oldest
      // Note: Sort happens on the Normalized items, so we type `a` and `b` as the inferred return type of Map.
      // Or we can define VerificationQueueItem.
      type VerificationQueueItem = typeof queue[0];

      return queue.sort((a: VerificationQueueItem, b: VerificationQueueItem) => {
        if (a.isPaid !== b.isPaid) return a.isPaid ? -1 : 1;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

    } catch (error) {
      this.logger.error('Failed to get verification queue', error);
      // NEVER throw 500
      return [];
    }
  }

  async findAllRequests(filters: { targetType?: VerificationType; status?: string }) {
    return this.prisma.verificationRequest.findMany({
      where: {
        ...(filters.targetType ? { targetType: filters.targetType } : {}),
        ...(filters.status ? { status: filters.status as VerificationStatus } : {})
      },
      include: {
        requester: { select: { id: true, name: true, email: true } },
        property: { select: { id: true, title: true } },
        items: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getRequest(id: string) {
    const request = await this.prisma.verificationRequest.findUnique({
      where: { id },
      include: {
        property: {
          include: {
            landlord: true,
            agentOwner: true,
            media: true,
            suburb: true,
            city: true,
            province: true
          }
        },
        items: {
          include: {
            verifier: { select: { id: true, name: true, email: true } },
            siteVisits: {
              where: { status: { in: ['PENDING_ASSIGNMENT', 'ASSIGNED', 'IN_PROGRESS'] } },
              include: {
                assignedModerator: { select: { id: true, name: true, email: true } }
              }
            }
          },
          orderBy: { type: 'asc' }
        },
        requester: true
      }
    });

    if (!request) {
      throw new NotFoundException('Verification request not found');
    }

    return request;
  }

  async reviewItem(requestId: string, itemId: string, dto: ReviewVerificationItemDto, actor: AuthContext) {
    try {
      // 1. BEFORE any database update: Fetch the VerificationRequestItem by ID
      const item = await this.prisma.verificationRequestItem.findUnique({
        where: { id: itemId },
        include: {
          verificationRequest: {
            select: {
              id: true,
              requesterId: true,
              propertyId: true,
              targetType: true
            }
          }
        }
      });

      // If not found → throw NotFoundException
      if (!item) {
        throw new NotFoundException('Verification item not found');
      }

      // Verify the item belongs to the request
      if (item.verificationRequestId !== requestId) {
        throw new BadRequestException('Item does not belong to the specified verification request');
      }

      // If item.status !== 'SUBMITTED' → throw BadRequestException
      if (item.status !== VerificationItemStatus.SUBMITTED) {
        throw new BadRequestException(`Cannot review item with status ${item.status}. Only SUBMITTED items can be reviewed.`);
      }

      // Idempotent check: If already in target state, return success without update
      if (item.status === dto.status) {
        this.logger.log(`Item ${itemId} already has status ${dto.status}, skipping update`);
        return this.prisma.verificationRequestItem.findUnique({ where: { id: itemId } });
      }

      // Validate rejection requires notes
      if (dto.status === VerificationItemStatus.REJECTED && !dto.notes) {
        throw new BadRequestException('Rejection reason (notes) is required when rejecting an item.');
      }

      // 2. Update ONLY the item
      await this.prisma.verificationRequestItem.update({
        where: { id: itemId },
        data: {
          status: dto.status,
          notes: dto.status === VerificationItemStatus.REJECTED ? dto.notes : item.notes,
          verifierId: actor.userId,
          reviewedAt: new Date()
        }
      });

      // 3. AFTER updating the item: Fetch all items for the same VerificationRequest
      const allItems: VerificationRequestItem[] = await this.prisma.verificationRequestItem.findMany({
        where: { verificationRequestId: requestId }
      });

      // Count APPROVED, REJECTED, SUBMITTED, PENDING
      const statusCounts = {
        APPROVED: allItems.filter((i: VerificationRequestItem) => i.status === VerificationItemStatus.APPROVED).length,
        REJECTED: allItems.filter((i: VerificationRequestItem) => i.status === VerificationItemStatus.REJECTED).length,
        SUBMITTED: allItems.filter((i: VerificationRequestItem) => i.status === VerificationItemStatus.SUBMITTED).length,
        PENDING: allItems.filter((i: VerificationRequestItem) => i.status === VerificationItemStatus.PENDING).length
      };

      // 4. Update VerificationRequest.status as follows:
      // - If ANY item is REJECTED → status = REJECTED
      // - Else if ALL items APPROVED → status = APPROVED
      // - Else → status = PENDING
      let newRequestStatus: VerificationStatus;
      if (statusCounts.REJECTED > 0) {
        newRequestStatus = VerificationStatus.REJECTED;
      } else if (statusCounts.APPROVED === allItems.length && allItems.length > 0) {
        newRequestStatus = VerificationStatus.APPROVED;
      } else {
        newRequestStatus = VerificationStatus.PENDING;
      }

      // Update request status
      await this.prisma.verificationRequest.update({
        where: { id: requestId },
        data: { status: newRequestStatus }
      });

      // Return the updated item
      return this.prisma.verificationRequestItem.findUnique({ where: { id: itemId } });
    } catch (error) {
      // Wrap the method in try/catch and log the error message before rethrowing
      console.error('[VERIFY ITEM ERROR]', error);
      this.logger.error('[VERIFY ITEM ERROR]', error);
      // Re-throw to let NestJS handle the HTTP response
      throw error;
    }
  }

  async recalculatePropertyScore(propertyId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        verificationRequests: {
          include: { items: true }
        }
      }
    });

    if (!property) return;

    let totalScore = 0;
    const approvedItems = property.verificationRequests
      .flatMap((r: any) => r.items)
      .filter((i: any) => i.status === 'APPROVED');

    for (const item of approvedItems) {
      if (item.type === 'PROOF_OF_OWNERSHIP') totalScore += 50;
      else if (item.type === 'PROPERTY_PHOTOS') totalScore += 30;
      else if (item.type === 'LOCATION_CONFIRMATION') {
        if (item.notes?.includes('On-site visit requested') || item.notes?.includes('On-site visit confirmed')) {
          totalScore += 50;
        } else {
          totalScore += 30;
        }
      }
    }

    totalScore = Math.max(0, totalScore);

    let newLevel = 'NONE';
    if (totalScore >= 80) newLevel = 'VERIFIED';
    else if (totalScore >= 50) newLevel = 'TRUSTED';
    else if (totalScore >= 1) newLevel = 'BASIC';

    const updateData: any = {
      verificationScore: totalScore,
      verificationLevel: newLevel as any
    };

    if (newLevel !== 'NONE') {
      updateData.status = PropertyStatus.VERIFIED;
      // Only set verifiedAt if not already verified
      if (property.status !== PropertyStatus.VERIFIED) {
        updateData.verifiedAt = new Date();
      }
    }

    await this.prisma.property.update({
      where: { id: propertyId },
      data: updateData
    });

    // Sync Trust Score
    await this.trust.calculatePropertyTrust(propertyId);
  }

  async recalculateUserScore(userId: string) {
    const requests = await this.prisma.verificationRequest.findMany({
      where: { targetUserId: userId, status: 'APPROVED' },
      include: { items: true }
    });

    let score = 0;
    let hasId = false;
    let hasSelfie = false;
    let hasAddress = false;

    (requests as (VerificationRequest & { items: any[] })[]).forEach((r) => {
      r.items.forEach((i) => {
        if (i.status === 'APPROVED') {
          if (i.type === 'IDENTITY_DOC') { score += 40; hasId = true; }
          if (i.type === 'SELFIE_VERIFICATION') { score += 30; hasSelfie = true; }
          if (i.type === 'PROOF_OF_ADDRESS') { score += 30; hasAddress = true; }
        }
      });
    });

    score = Math.min(100, score);
    const isVerified = hasId || (hasAddress && hasSelfie) || score >= 40;

    await this.prisma.user.update({
      where: { id: userId },
      data: { verificationScore: score, isVerified: isVerified }
    });
  }

  async recalculateAgencyScore(agencyId: string) {
    const requests = await this.prisma.verificationRequest.findMany({
      where: { agencyId: agencyId, status: 'APPROVED' },
      include: { items: true }
    });

    let score = 0;
    let docsCount = 0;

    (requests as (VerificationRequest & { items: any[] })[]).forEach((r) => {
      r.items.forEach((i) => {
        if (i.status === 'APPROVED') {
          if (i.type === 'COMPANY_REGS') score += 40;
          if (i.type === 'TAX_CLEARANCE') score += 30;
          if (i.type === 'DIRECTOR_ID') score += 20;
          if (i.type === 'BUSINESS_ADDRESS') score += 10;
          docsCount++;
        }
      });
    });

    score = Math.min(100, score);
    const isVerified = docsCount >= 2;

    await this.prisma.agency.update({
      where: { id: agencyId },
      data: {
        verificationScore: score,
        verifiedAt: isVerified ? new Date() : null,
        trustScore: score // Base trust score on verification score for now
      }
    });
  }



  async assignItem(requestId: string, itemId: string, verifierId: string, actor: AuthContext) {
    if (actor.userId !== verifierId) {
      // Only admins can assign others? Or managers?
      // Assuming strictly admin for now or self-assign.
    }

    const request = await this.prisma.verificationRequest.findUnique({
      where: { id: requestId },
      include: { items: true }
    });

    if (!request) throw new NotFoundException('Request not found');
    const item = request.items.find((i: VerificationRequestItem) => i.id === itemId);
    if (!item) throw new NotFoundException('Item not found');

    return this.prisma.verificationRequestItem.update({
      where: { id: itemId },
      data: { verifierId }
    });
  }

  private async ensurePendingProperty(id: string) {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property || property.status !== PropertyStatus.PENDING_VERIFY) {
      throw new NotFoundException('Property not awaiting verification');
    }
    return property;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
