import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PropertyStatus, VerificationResult, VerificationItemStatus, VerificationStatus, VerificationRequestItem } from '@prisma/client';
// Use string or explicit type for VerificationType if Prisma client is being difficult
const VerificationType = {
  PROPERTY: 'PROPERTY',
  USER: 'USER',
  COMPANY: 'COMPANY'
} as any;
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ReviewVerificationDto } from './dto/review-verification.dto';
import { ReviewVerificationItemDto } from '../properties/dto/review-verification-item.dto';

interface AuthContext {
  userId: string;
}

import { TrustService } from '../trust/trust.service';
import { RiskService, RiskSignalType } from '../trust/risk.service';

@Injectable()
export class VerificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly trust: TrustService,
    private readonly riskService: RiskService
  ) { }

  async listQueue() {
    const properties = await this.prisma.property.findMany({
      where: { status: PropertyStatus.PENDING_VERIFY },
      include: {
        landlord: true,
        agentOwner: true,
        media: true,
        listingPayments: true,
        verificationRequests: {
          where: { status: 'PENDING' },
          include: {
            items: {
              orderBy: { type: 'asc' }
            },
            requester: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    const enriched = properties.map((p: any) => {
      const isPaid = p.listingPayments.some((lp: any) => lp.type === 'VERIFICATION' && lp.status === 'PAID');
      const req = p.verificationRequests[0];
      const completedCount = req?.items.filter((i: any) => i.status === 'APPROVED').length || 0;
      const hasOnSiteRequest = req?.items.some((i: any) => i.notes?.includes('On-site visit requested')) || false;
      return { ...p, isPaid, completedCount, hasOnSiteRequest };
    });

    return enriched.sort((a: any, b: any) => {
      // 1. Paid first
      if (a.isPaid && !b.isPaid) return -1;
      if (!a.isPaid && b.isPaid) return 1;

      // 2. On-site Request first
      if (a.hasOnSiteRequest && !b.hasOnSiteRequest) return -1;
      if (!a.hasOnSiteRequest && b.hasOnSiteRequest) return 1;

      // 3. Older first (createdAt asc)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  async findAllRequests(filters: { targetType?: VerificationType; status?: string }) {
    return this.prisma.verificationRequest.findMany({
      where: {
        ...(filters.targetType ? { targetType: filters.targetType } : {}),
        ...(filters.status ? { status: filters.status as any } : {})
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
    // 1. Get the request and item
    const request = await this.prisma.verificationRequest.findUnique({
      where: { id: requestId },
      include: {
        items: true,
        property: true,
        requester: true
      }
    });

    if (!request) {
      throw new NotFoundException('Verification request not found');
    }

    const item = request.items.find((i: VerificationRequestItem) => i.id === itemId);
    if (!item) {
      throw new NotFoundException('Verification item not found');
    }

    // 2. Validate Transition
    if (item.status !== VerificationItemStatus.SUBMITTED && item.status !== VerificationItemStatus.PENDING) {
      // Allow reviewing PENDING items too if admin enforces it?
      // Default logic was strictly SUBMITTED. Keeping it strict for consistency unless necessary.
      if (item.status !== VerificationItemStatus.SUBMITTED) {
        throw new BadRequestException(`Cannot review item with status ${item.status}. Only SUBMITTED items can be reviewed.`);
      }
    }

    if (dto.status === VerificationItemStatus.REJECTED && !dto.notes) {
      throw new BadRequestException('Rejection reason (notes) is required when rejecting an item.');
    }

    // Phase G: Moderator Safety - No self-review
    if (request.requesterId === actor.userId) {
      await this.riskService.recordRiskEvent({
        entityType: 'USER',
        entityId: actor.userId,
        signalType: RiskSignalType.MANUAL_ADMIN_FLAG,
        scoreDelta: 5,
        notes: `Attempted self-review of verification request: ${requestId}`
      });
      throw new ForbiddenException('Moderators cannot review their own verification requests.');
    }

    // No review of property owned by them
    if (request.property && ((request.property as any).landlordId === actor.userId || (request.property as any).agentOwnerId === actor.userId)) {
      throw new ForbiddenException('Moderators cannot review properties they own or manage.');
    }

    // 3. Update the item
    await this.prisma.verificationRequestItem.update({
      where: { id: itemId },
      data: {
        status: dto.status,
        notes: dto.status === VerificationItemStatus.REJECTED ? dto.notes : item.notes,
        verifierId: actor.userId,
        reviewedAt: new Date()
      }
    });

    // Random Audit Sampling (10%)
    if (dto.status === VerificationItemStatus.APPROVED && Math.random() < 0.1) {
      await this.riskService.recordRiskEvent({
        entityType: 'USER',
        entityId: actor.userId,
        signalType: RiskSignalType.MANUAL_ADMIN_FLAG,
        scoreDelta: 0,
        notes: `Random audit sample: item ${itemId} approved by ${actor.userId}`
      });
    }

    // 3.5 Location Logic (Property Only)
    // Use targetType
    if (request.targetType === VerificationType.PROPERTY && item.type === 'LOCATION_CONFIRMATION' && request.property) {
      if (dto.status === 'APPROVED' && item.gpsLat && item.gpsLng) {
        const propLat = (request.property as any).lat || (request.property as any).suburb?.latitude;
        const propLng = (request.property as any).lng || (request.property as any).suburb?.longitude;

        if (propLat && propLng) {
          const dist = this.calculateDistance(propLat, propLng, item.gpsLat, item.gpsLng);
          if (dist > 5) {
            // Warning only (log if needed)
          }
        }
      }
    }

    // 4. Recalculate Score & Trust
    if (request.targetType === VerificationType.PROPERTY) {
      if (request.propertyId) {
        await this.recalculatePropertyScore(request.propertyId);
        await this.trust.calculatePropertyTrust(request.propertyId);
      }
    } else if (request.targetType === VerificationType.USER) {
      if (request.targetUserId) {
        await this.recalculateUserScore(request.targetUserId);
        await this.trust.calculateUserTrust(request.targetUserId);
      }
    } else if (request.targetType === VerificationType.COMPANY) {
      if (request.agencyId) {
        await this.recalculateAgencyScore(request.agencyId);
        await this.trust.calculateCompanyTrust(request.agencyId);
      }
    }

    // 5. Update Request Status
    const remainingValues = request.items
      .filter((i: VerificationRequestItem) => i.id !== itemId)
      .map((i: VerificationRequestItem) => i.status);
    remainingValues.push(dto.status);

    if (remainingValues.every((s: VerificationItemStatus) => s === VerificationItemStatus.APPROVED)) {
      await this.prisma.verificationRequest.update({
        where: { id: requestId },
        data: { status: VerificationStatus.APPROVED }
      });

      // Auto-Verify Entity?
      if (request.targetType === VerificationType.USER && request.targetUserId) {
        await this.recalculateUserScore(request.targetUserId);
        await this.trust.calculateUserTrust(request.targetUserId);
      }
      if (request.targetType === VerificationType.COMPANY && request.agencyId) {
        await this.recalculateAgencyScore(request.agencyId);
        await this.trust.calculateCompanyTrust(request.agencyId);
      }
    }

    return this.prisma.verificationRequestItem.findUnique({ where: { id: itemId } });
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
      .filter((i: VerificationRequestItem) => i.status === 'APPROVED');

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

    requests.forEach((r: any) => {
      r.items.forEach((i: any) => {
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

    requests.forEach((r: any) => {
      r.items.forEach((i: any) => {
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

  async approve(id: string, dto: ReviewVerificationDto, actor: AuthContext) {
    await this.ensurePendingProperty(id);

    const [updated, verification] = await this.prisma.$transaction([
      this.prisma.property.update({
        where: { id },
        data: {
          status: PropertyStatus.VERIFIED,
          verifiedAt: new Date()
        }
      }),
      this.prisma.verification.create({
        data: {
          propertyId: id,
          verifierId: actor.userId,
          method: dto.method,
          notes: dto.notes,
          evidenceUrl: dto.evidenceUrl,
          result: VerificationResult.PASS
        }
      })
    ]);

    await this.audit.log({
      action: 'verification.approve',
      actorId: actor.userId,
      targetType: 'property',
      targetId: id,
      metadata: { verificationId: verification.id }
    });

    return { property: updated, verification };
  }

  async reject(id: string, dto: ReviewVerificationDto, actor: AuthContext) {
    const property = await this.ensurePendingProperty(id);

    const [updated, verification] = await this.prisma.$transaction([
      this.prisma.property.update({
        where: { id },
        data: {
          status: PropertyStatus.ARCHIVED
        }
      }),
      this.prisma.verification.create({
        data: {
          propertyId: id,
          verifierId: actor.userId,
          method: dto.method,
          notes: dto.notes,
          evidenceUrl: dto.evidenceUrl,
          result: VerificationResult.FAIL
        }
      })
    ]);

    await this.audit.log({
      action: 'verification.reject',
      actorId: actor.userId,
      targetType: 'property',
      targetId: id,
      metadata: { verificationId: verification.id, previousStatus: property.status }
    });

    return { property: updated, verification };
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
