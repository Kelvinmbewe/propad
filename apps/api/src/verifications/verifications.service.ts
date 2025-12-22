import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PropertyStatus, VerificationResult, VerificationItemStatus, VerificationStatus, VerificationRequestItem } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ReviewVerificationDto } from './dto/review-verification.dto';
import { ReviewVerificationItemDto } from '../properties/dto/review-verification-item.dto';

interface AuthContext {
  userId: string;
}

@Injectable()
export class VerificationsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) { }

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
        property: true
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
    // Only SUBMITTED items can be reviewed.
    if (item.status !== VerificationItemStatus.SUBMITTED) {
      throw new BadRequestException(`Cannot review item with status ${item.status}. Only SUBMITTED items can be reviewed.`);
    }

    if (dto.status === VerificationItemStatus.REJECTED && !dto.notes) {
      throw new BadRequestException('Rejection reason (notes) is required when rejecting an item.');
    }

    // 3. Update the item
    try {
      await this.prisma.verificationRequestItem.update({
        where: { id: itemId },
        data: {
          status: dto.status,
          notes: dto.status === VerificationItemStatus.REJECTED ? dto.notes : item.notes,
          verifierId: actor.userId,
          reviewedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to update verification item:', error);
      throw new BadRequestException('Failed to update verification item. Please check the status and try again.');
    }

    // 3.5 Incremental Score Calculation (Optimization)
    // Calculate points for this specific item
    let points = 0;
    switch (item.type) {
      case 'PROOF_OF_OWNERSHIP':
        points = 40;
        break;
      case 'PROPERTY_PHOTOS':
        points = 20;
        break;
      case 'LOCATION_CONFIRMATION':
        // Site Visit Validation
        if (dto.status === 'APPROVED' && item.gpsLat && item.gpsLng) {
          const propLat = (request.property as any).lat || (request.property.suburb as any)?.latitude;
          const propLng = (request.property as any).lng || (request.property.suburb as any)?.longitude;

          if (propLat && propLng) {
            const dist = this.calculateDistance(propLat, propLng, item.gpsLat, item.gpsLng);
            if (dist > 5) {
              throw new BadRequestException(`Location verification failed: Distance to property is ${dist.toFixed(1)}km (Limit: 5km).`);
            }
          }
        }

        if (item.notes?.includes('On-site visit requested') || dto.notes?.includes('On-site visit confirmed')) {
          points = 50; // Validated On-site
        } else {
          points = 30; // GPS only
        }
        break;
    }

    let scoreDelta = 0;
    // If transitioning TO Approved
    if (dto.status === VerificationItemStatus.APPROVED && item.status !== VerificationItemStatus.APPROVED) {
      scoreDelta = points;
    }
    // If transitioning FROM Approved (e.g. correction)
    else if (item.status === VerificationItemStatus.APPROVED && dto.status !== VerificationItemStatus.APPROVED) {
      scoreDelta = -points;
    }

    // Calculate New Level locally
    const currentScore = request.property.verificationScore || 0;
    const newScore = Math.max(0, currentScore + scoreDelta);

    let newLevel = 'NONE';
    if (newScore >= 80) newLevel = 'VERIFIED'; // Gold
    else if (newScore >= 50) newLevel = 'TRUSTED'; // Silver
    else if (newScore >= 1) newLevel = 'BASIC'; // Bronze

    // 4. Update Property (Immediate Verification Rule)
    const propertyUpdateData: any = {
      verificationScore: newScore,
      verificationLevel: newLevel as any
    };

    // Rule: A property becomes VERIFIED (as in "Verified Status") based on Level?
    // Requirement A.3: "Derive verificationLevel dynamically... Gold => 80+"
    // Requirement B.5: "Display badge based on verificationLevel"
    // Existing Rule: "A property becomes VERIFIED once ANY verification item is approved." -> This was for status.
    // We should keep the STATUS as VERIFIED if score > 0 (Basic+), or strictly Gold?
    // "Do not change existing verification statuses" -> Breaking change if we revert.
    // If Level >= BASIC, Status = VERIFIED.

    // Update: If newLevel is NOT NONE, set property status to VERIFIED to maintain visibility.
    if (newLevel !== 'NONE') {
      propertyUpdateData.status = PropertyStatus.VERIFIED;
      if (request.property.status !== PropertyStatus.VERIFIED) {
        propertyUpdateData.verifiedAt = new Date();
      }
    } else {
      // If score drops to 0, should we revert to PENDING? 
      // Requirement "Lock-in Safety: Verification intelligence MUST NOT block actions".
      // Let's leave it as is, or revert if 0. 
      // Ideally if score 0, status is PENDING_VERIFY.
      if (newScore === 0) {
        // propertyUpdateData.status = PropertyStatus.PENDING_VERIFY; // Optional robustness
      }
    }

    await this.prisma.property.update({
      where: { id: request.propertyId },
      data: propertyUpdateData
    });

    // 5. Update Request Status (Optional: Keep roughly in sync)
    // If we just Approved an item, the Request is effectively "In Progress" or "Partially Approved".
    // We strictly avoid "Waiting for all" to block Verified status, but we can update the Request status for record keeping.
    // If ALL items are now approved, mark Request as APPROVED.
    const remainingValues = request.items
      .filter((i: VerificationRequestItem) => i.id !== itemId)
      .map((i: VerificationRequestItem) => i.status);
    remainingValues.push(dto.status);

    if (remainingValues.every((s: VerificationItemStatus) => s === VerificationItemStatus.APPROVED)) {
      await this.prisma.verificationRequest.update({
        where: { id: requestId },
        data: { status: VerificationStatus.APPROVED }
      });
    } else if (remainingValues.some((s: VerificationItemStatus) => s === VerificationItemStatus.REJECTED)) {
      // If any rejected, we might mark request as REJECTED or just leave PENDING.
      // For now, let's leave generic PENDING unless all are resolved.
      // Optimization: Don't block Property.VERIFIED status on this.
    }

    return this.prisma.verificationRequestItem.findUnique({ where: { id: itemId } });
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
