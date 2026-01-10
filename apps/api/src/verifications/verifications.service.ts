import { Injectable, NotFoundException, BadRequestException, ForbiddenException, UnauthorizedException, Logger } from '@nestjs/common';
import {
  PropertyStatus,
  VerificationResult,
  VerificationRequestItem,
  VerificationType,
  Property,
  VerificationRequest,
  Prisma
} from '@prisma/client';

const VerificationStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;
type VerificationStatus = typeof VerificationStatus[keyof typeof VerificationStatus];

const VerificationItemStatus = {
  PENDING: 'PENDING',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;
type VerificationItemStatus = typeof VerificationItemStatus[keyof typeof VerificationItemStatus];
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

import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class VerificationsService {
  private readonly logger = new Logger(VerificationsService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly trust: TrustService,
    private readonly riskService: RiskService,
    private readonly notifications: NotificationsService
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

  async findAllRequests(filters: { targetType?: VerificationType; status?: string; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

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
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
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
            // JOIN related SiteVisit using verificationItemId (Location Confirmation)
            // Include all site visits (not just active ones) to show COMPLETED/FAILED status
            siteVisits: {
              include: {
                // Include assignedOfficer.name + role
                assignedModerator: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true
                  }
                }
              },
              orderBy: { createdAt: 'desc' } // Most recent first
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
      const action = dto.status === VerificationItemStatus.APPROVED ? 'APPROVE' : 'REJECT';
      console.log('[VERIFY ACTION]', itemId, action);

      // BEFORE updating VerificationRequestItem: Extract verifierId strictly from actor.userId
      // DO NOT use fallbacks (email, role, etc)
      // If verifierId is missing → throw UnauthorizedException
      if (!actor.userId || typeof actor.userId !== 'string' || actor.userId.trim() === '') {
        throw new UnauthorizedException('Verifier ID is required');
      }

      const verifierId = actor.userId.trim();

      // 1. Add strict guards BEFORE any database update: Fetch the VerificationRequestItem by id
      const item = await this.prisma.verificationRequestItem.findUnique({
        where: { id: itemId },
        include: {
          verificationRequest: {
            select: {
              id: true,
              status: true
            }
          }
        }
      });

      // If item does not exist → throw NotFoundException
      if (!item) {
        throw new NotFoundException('Verification item not found');
      }

      // Verify the item belongs to the request
      if (item.verificationRequestId !== requestId) {
        throw new BadRequestException('Item does not belong to the specified verification request');
      }

      // If item.status !== SUBMITTED → throw BadRequestException("Item not submitted")
      if (item.status !== VerificationItemStatus.SUBMITTED) {
        throw new BadRequestException('Item not submitted');
      }

      // If item.evidence is null or empty → throw BadRequestException("No evidence submitted")
      // Check evidenceUrls array - for location items, check GPS or notes instead
      const hasEvidence = item.type === 'LOCATION_CONFIRMATION'
        ? (item.gpsLat && item.gpsLng) || item.notes?.includes('On-site visit requested')
        : (item.evidenceUrls && Array.isArray(item.evidenceUrls) && item.evidenceUrls.length > 0);

      if (!hasEvidence) {
        throw new BadRequestException('No evidence submitted');
      }

      // Validate rejection requires notes
      if (dto.status === VerificationItemStatus.REJECTED && !dto.notes) {
        throw new BadRequestException('Rejection reason (notes) is required when rejecting an item.');
      }

      // Idempotent check: If already in target state, return success without update
      if (item.status === dto.status) {
        this.logger.log(`Item ${itemId} already has status ${dto.status}, skipping update`);
        return this.prisma.verificationRequestItem.findUnique({ where: { id: itemId } });
      }

      // 2. Wrap ALL updates in a Prisma transaction
      return await this.prisma.$transaction(async (tx) => {
        // Validate verifier exists: const verifier = await tx.user.findUnique({ where: { id: verifierId } });
        // If not found → throw BadRequestException("Invalid verifier")
        const verifier = await tx.user.findUnique({
          where: { id: verifierId },
          select: { id: true }
        });

        if (!verifier) {
          throw new BadRequestException('Invalid verifier');
        }

        // Only after validation, update VerificationRequestItem:
        // - status = APPROVED or REJECTED
        // - verifierId = verifier.id (use validated verifier.id, not actor.userId)
        // - reviewedAt = new Date()
        await tx.verificationRequestItem.update({
          where: { id: itemId },
          data: {
            status: dto.status,
            notes: dto.status === VerificationItemStatus.REJECTED ? dto.notes : item.notes,
            verifierId: verifier.id, // Use validated verifier.id - ensure verifierId is NEVER null and NEVER fabricated
            reviewedAt: new Date()
          }
        });

        // Recalculate parent VerificationRequest.status based on item counts
        const allItems: VerificationRequestItem[] = await tx.verificationRequestItem.findMany({
          where: { verificationRequestId: requestId }
        });

        // Count APPROVED, REJECTED, SUBMITTED, PENDING
        const statusCounts = {
          APPROVED: allItems.filter((i: VerificationRequestItem) => i.status === VerificationItemStatus.APPROVED).length,
          REJECTED: allItems.filter((i: VerificationRequestItem) => i.status === VerificationItemStatus.REJECTED).length,
          SUBMITTED: allItems.filter((i: VerificationRequestItem) => i.status === VerificationItemStatus.SUBMITTED).length,
          PENDING: allItems.filter((i: VerificationRequestItem) => i.status === VerificationItemStatus.PENDING).length
        };

        // Request status rules:
        // - If ANY item is REJECTED → request stays PENDING
        // - If ALL items are APPROVED → request becomes APPROVED
        // - Otherwise → request remains PENDING
        let newRequestStatus: VerificationStatus;
        if (statusCounts.REJECTED > 0) {
          // If ANY item is REJECTED → request stays PENDING (not REJECTED)
          newRequestStatus = VerificationStatus.PENDING;
        } else if (statusCounts.APPROVED === allItems.length && allItems.length > 0) {
          // If ALL items are APPROVED → request becomes APPROVED
          newRequestStatus = VerificationStatus.APPROVED;
        } else {
          // Otherwise → request remains PENDING
          newRequestStatus = VerificationStatus.PENDING;
        }

        // Update VerificationRequest.updatedAt (happens automatically via @updatedAt)
        await tx.verificationRequest.update({
          where: { id: requestId },
          data: { status: newRequestStatus }
        });

        // NOTIFICATION LOGIC
        // Ideally done via Event Bus, but direct call is fine for B4
        // Must fetch requesterId to notify them
        // Re-fetch request with requester info within transaction
        const updatedRequest = await tx.verificationRequest.findUnique({
          where: { id: requestId },
          select: { requesterId: true, property: { select: { title: true } } }
        });

        if (updatedRequest?.requesterId) {
          const title = updatedRequest.property?.title || 'Item';
          if (dto.status === VerificationItemStatus.REJECTED) {
            await this.notifications.notifyUser(
              updatedRequest.requesterId,
              NotificationType.VERIFICATION_UPDATE,
              'Verification Item Rejected',
              `An item for ${title} was rejected: ${dto.notes || 'No reason provided'}`
            );
          } else if (newRequestStatus === VerificationStatus.APPROVED) {
            await this.notifications.notifyUser(
              updatedRequest.requesterId,
              NotificationType.VERIFICATION_UPDATE,
              'Verification Approved',
              `Your verification request for ${title} has been fully approved!`
            );
          }
        }

        // Return the updated item
        const updatedItem = await tx.verificationRequestItem.findUnique({ where: { id: itemId } });

        // AUTO-DECISION LOGIC
        // If ALL items are APPROVED -> Execute applyOutcome(APPROVED)
        // If ANY item is REJECTED -> Execute applyOutcome(PENDING) or leave as is? 
        // Logic: reviewItem handles item-level. If all items done, we finalize.

        // Re-check updated counts
        const finalAllItems = await tx.verificationRequestItem.findMany({ where: { verificationRequestId: requestId } });
        const allApproved = finalAllItems.every(i => i.status === 'APPROVED');

        if (allApproved) {
          // Trigger Side Effects for Full Approval
          // We can't call this.applyOutcome directly inside transaction efficiently without passing TX or reorganizing.
          // Ideally we just update the entities HERE inside the TX.
          const req = await tx.verificationRequest.findUnique({ where: { id: requestId } });
          if (req && req.status !== 'APPROVED') {
            await tx.verificationRequest.update({ where: { id: requestId }, data: { status: 'APPROVED', reviewedAt: new Date() } });

            // Mutate Entity
            if (req.targetType === 'PROPERTY' && req.propertyId) {
              await tx.property.update({ where: { id: req.propertyId }, data: { status: 'VERIFIED', verifiedAt: new Date() } });
            } else if (req.targetType === 'USER' && req.targetUserId) {
              await tx.user.update({ where: { id: req.targetUserId }, data: { isVerified: true } });
            } else if (req.targetType === 'COMPANY' && req.agencyId) {
              await tx.agency.update({ where: { id: req.agencyId }, data: { verifiedAt: new Date() } });
            }
          }
        }

        return updatedItem;
      });
    } catch (error) {
      // Ensure ALL thrown errors are proper HTTP exceptions
      // If it's already a NestJS HTTP exception, re-throw it
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException || error instanceof UnauthorizedException) {
        throw error;
      }

      // Wrap the method in try/catch and log the error message before rethrowing
      console.error('[VERIFY ITEM ERROR]', error);
      this.logger.error('[VERIFY ITEM ERROR]', error);

      // Convert unknown errors to BadRequestException
      throw new BadRequestException(error instanceof Error ? error.message : 'Failed to review verification item');
    }
  }

  async decideRequest(requestId: string, status: 'APPROVED' | 'REJECTED', notes: string, actorId: string) {
    const request = await this.prisma.verificationRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Request not found');

    // Update Request status
    await this.prisma.$transaction(async (tx) => {
      await tx.verificationRequest.update({
        where: { id: requestId },
        data: { status, reviewedAt: new Date(), notes } // Assuming 'notes' field exists on Request or added? Schema check: Request has notes.
      });

      // If Approved, mutate entity
      if (status === 'APPROVED') {
        if (request.targetType === 'PROPERTY' && request.propertyId) {
          await tx.property.update({ where: { id: request.propertyId }, data: { status: 'VERIFIED', verifiedAt: new Date() } });
        } else if (request.targetType === 'USER' && request.targetUserId) {
          await tx.user.update({ where: { id: request.targetUserId }, data: { isVerified: true } });
        } else if (request.targetType === 'COMPANY' && request.agencyId) {
          await tx.agency.update({ where: { id: request.agencyId }, data: { verifiedAt: new Date() } });
        }
      }
    });

    await this.audit.logAction({
      action: 'VERIFICATION_DECIDE',
      actorId: actorId,
      targetType: 'VERIFICATION_REQUEST',
      targetId: requestId,
      metadata: { status, notes }
    });

    // Notify
    if (request.requesterId) {
      await this.notifications.notifyUser(
        request.requesterId,
        NotificationType.VERIFICATION_UPDATE,
        `Verification ${status}`,
        `Your verification request was ${status.toLowerCase()}. ${notes || ''}`
      );
    }

    return this.getRequest(requestId);
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

    (requests as (VerificationRequest & { items: any[] })[]).forEach((r) => {
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

  async createRequest(requesterId: string, data: { targetType: VerificationType; targetId: string; items: { type: any; evidenceUrls?: string[]; notes?: string }[] }) {
    // Check for existing pending request
    const existing = await this.prisma.verificationRequest.findFirst({
      where: {
        requesterId,
        targetType: data.targetType,
        // Depending on type, use targetUserId or propertyId or agencyId
        ...(data.targetType === 'PROPERTY' ? { propertyId: data.targetId } : {}),
        ...(data.targetType === 'USER' ? { targetUserId: data.targetId } : {}),
        ...(data.targetType === 'COMPANY' ? { agencyId: data.targetId } : {}),
        status: 'PENDING'
      }
    });

    if (existing) {
      // Ideally we'd allow updating items, but for now block duplicate
      throw new BadRequestException('A pending verification request already exists for this target.');
    }

    // Prepare create data
    const createData: any = {
      requesterId,
      targetType: data.targetType,
      status: 'PENDING',
      items: {
        create: data.items.map(i => ({
          type: i.type,
          status: 'SUBMITTED', // Auto-submit on creation
          evidenceUrls: i.evidenceUrls || [],
          notes: i.notes
        }))
      }
    };

    if (data.targetType === 'PROPERTY') createData.propertyId = data.targetId;
    else if (data.targetType === 'USER') createData.targetUserId = data.targetId;
    else if (data.targetType === 'COMPANY') createData.agencyId = data.targetId;

    const request = await this.prisma.verificationRequest.create({
      data: createData,
      include: { items: true }
    });

    // Log Audit
    await this.audit.logAction({
      action: 'VERIFICATION_SUBMIT',
      actorId: requesterId,
      targetType: 'VERIFICATION_REQUEST',
      targetId: request.id,
      metadata: { targetType: data.targetType, targetId: data.targetId }
    });

    return request;
  }

  async getMyRequests(userId: string) {
    return this.prisma.verificationRequest.findMany({
      where: { requesterId: userId },
      include: {
        items: true,
        property: { select: { title: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async assignVerifierToRequest(requestId: string, verifierId: string, actorId: string) {
    const request = await this.prisma.verificationRequest.findUnique({ where: { id: requestId }, include: { items: true } });
    if (!request) throw new NotFoundException('Request not found');

    // Verify the verifier exists and has role?
    // For now, trust the ID passed by Admin.

    await this.prisma.$transaction(async (tx) => {
      // Assign all items that are pending/submitted to this verifier
      await tx.verificationRequestItem.updateMany({
        where: { verificationRequestId: requestId },
        data: { verifierId }
      });
    });

    await this.audit.logAction({
      action: 'VERIFICATION_ASSIGN',
      actorId,
      targetType: 'VERIFICATION_REQUEST',
      targetId: requestId,
      metadata: { verifierId }
    });
    return this.getRequest(requestId);
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
