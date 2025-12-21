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

  listQueue() {
    return this.prisma.property.findMany({
      where: { status: PropertyStatus.PENDING_VERIFY },
      include: {
        landlord: true,
        agentOwner: true,
        media: true,
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
      },
      orderBy: { createdAt: 'asc' }
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
            media: true
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

    // 2. Update the item
    // 2. Update the item
    try {
      await this.prisma.verificationRequestItem.update({
        where: { id: itemId },
        data: {
          status: dto.status,
          rejectionReason: dto.status === VerificationItemStatus.REJECTED ? dto.notes : null,
          verifierId: actor.userId,
          verifiedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to update verification item:', error);
      throw new BadRequestException('Failed to update verification item. Please check the status and try again.');
    }

    // 3. Check if all items are resolved (approved or rejected)
    // We fetch fresh items to be sure
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
              status: VerificationStatus.APPROVED,
              reviewedAt: new Date(),
              reviewerId: actor.userId
            }
          }),
          this.prisma.property.update({
            where: { id: request.propertyId },
            data: {
              status: PropertyStatus.VERIFIED,
              verifiedAt: new Date()
            }
          }),
          // Create the lightweight Verification record for legacy/schema compatibility if needed
          this.prisma.verification.create({
            data: {
              propertyId: request.propertyId,
              verifierId: actor.userId,
              method: 'DOCS', // Defaulting as this handles multiple
              result: VerificationResult.PASS
            }
          })
        ]);
      } else {
        // AT LEAST ONE REJECTED
        await this.prisma.verificationRequest.update({
          where: { id: requestId },
          data: {
            status: VerificationStatus.REJECTED,
            reviewedAt: new Date(),
            reviewerId: actor.userId
          }
        });
        // We do NOT archive the property, we leave it as PENDING_VERIFY or revert to DRAFT?
        // Leaving as PENDING_VERIFY allows user to see the rejection and resubmit.
      }
    }

    // Return the updated item
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

  private async ensurePendingProperty(id: string) {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property || property.status !== PropertyStatus.PENDING_VERIFY) {
      throw new NotFoundException('Property not awaiting verification');
    }
    return property;
  }
}
