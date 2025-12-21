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
      return { ...p, isPaid, completedCount };
    });

    return enriched.sort((a: any, b: any) => {
      // 1. Paid first
      if (a.isPaid && !b.isPaid) return -1;
      if (!a.isPaid && b.isPaid) return 1;

      // 2. Highest Score first
      const scoreA = a.verificationScore || 0;
      const scoreB = b.verificationScore || 0;
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }

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
          // If rejected, store notes as rejectionReason. Currently schema might have rejectionReason or just use notes?
          // Looking at schema snippet earlier: `rejectionReason: dto.status === VerificationItemStatus.REJECTED ? dto.notes : null` logic was used.
          // Schema text said: notes String? // User notes or verifier feedback.
          // Wait, I recall schema snippet "rejectionReason" was NOT in the snippet at step 311.
          // The snippet at 314 shows:
          // notes                 String?               // User notes or verifier feedback
          // verifierId            String?               // Admin/verifier who reviewed
          // reviewedAt            DateTime?
          // NO rejectionReason column in the snippet!
          // So I MUST use `notes` field for rejection reason if schema has no rejectionReason column.
          // Wait, task 3 says: "On REJECT: status = REJECTED, reviewerNote REQUIRED".
          // If schema has no rejectionReason, I must overwrite notes or append?
          // Ideally overwrite if it's a rejection from admin.
          notes: dto.status === VerificationItemStatus.REJECTED ? dto.notes : item.notes,
          verifierId: actor.userId,
          reviewedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to update verification item:', error);
      throw new BadRequestException('Failed to update verification item. Please check the status and try again.');
    }

    // 3.5 Recalculate Score & Level
    await this.updatePropertyVerificationStatus(request.propertyId);

    // 4. Check if all items are resolved
    const updatedRequest = await this.prisma.verificationRequest.findUnique({
      where: { id: requestId },
      include: { items: true }
    });

    const allItems = updatedRequest.items;
    const allReviewed = allItems.every((i: VerificationRequestItem) =>
      i.status === VerificationItemStatus.APPROVED ||
      i.status === VerificationItemStatus.REJECTED
    );

    if (allReviewed) {
      // Determine final request status
      const anyRejected = allItems.some((i: VerificationRequestItem) => i.status === VerificationItemStatus.REJECTED);

      if (!anyRejected) {
        // ALL APPROVED
        await this.prisma.$transaction([
          this.prisma.verificationRequest.update({
            where: { id: requestId },
            data: {
              status: VerificationStatus.APPROVED
            }
          }),
          this.prisma.property.update({
            where: { id: request.propertyId },
            data: {
              status: PropertyStatus.VERIFIED,
              verifiedAt: new Date()
            }
          }),
          this.prisma.verification.create({
            data: {
              propertyId: request.propertyId,
              verifierId: actor.userId,
              method: 'DOCS',
              result: VerificationResult.PASS
            }
          })
        ]);
      } else {
        // AT LEAST ONE REJECTED
        await this.prisma.verificationRequest.update({
          where: { id: requestId },
          data: {
            status: VerificationStatus.REJECTED
          }
        });
      }
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

  private async updatePropertyVerificationStatus(propertyId: string) {
    const request = await this.prisma.verificationRequest.findFirst({
      where: { propertyId },
      include: { items: true },
      orderBy: { createdAt: 'desc' }
    });

    if (!request) return;

    let score = 0;
    for (const item of request.items) {
      if (item.status === VerificationItemStatus.APPROVED) {
        switch (item.type) {
          case 'PROOF_OF_OWNERSHIP':
            score += 40;
            break;
          case 'PROPERTY_PHOTOS':
            score += 20;
            break;
          case 'LOCATION_CONFIRMATION':
            if (item.notes?.includes('On-site visit requested')) {
              // If it was requested AND Approved, it means site visit done.
              // NOTE: This relies on the convention that "On-site visit requested" note persists
              // and admin approves it after visiting.
              score += 50;
            } else {
              score += 30; // GPS only
            }
            break;
        }
      }
    }

    // Determine Level
    let level: 'NONE' | 'BASIC' | 'TRUSTED' | 'VERIFIED' = 'NONE';
    if (score >= 100) level = 'VERIFIED';
    else if (score >= 70) level = 'TRUSTED';
    else if (score >= 30) level = 'BASIC';

    await this.prisma.property.update({
      where: { id: propertyId },
      data: {
        verificationScore: score,
        verificationLevel: level
      }
    });

    return { score, level };
  }

  private async ensurePendingProperty(id: string) {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property || property.status !== PropertyStatus.PENDING_VERIFY) {
      throw new NotFoundException('Property not awaiting verification');
    }
    return property;
  }
}
