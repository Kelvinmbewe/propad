import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  LeaseStatus,
  PropertyStatus,
  RatingContext,
  RatingTargetType,
  RentPaymentMethod,
  RentPaymentRecordStatus,
} from "@prisma/client";
import { Role } from "@propad/config";
import { AuthContext } from "../auth/interfaces/auth-context.interface";
import { PrismaService } from "../prisma/prisma.service";
import { CreateLeasePaymentDto } from "./dto/create-lease-payment.dto";
import { CreateRentalRatingDto } from "./dto/create-rental-rating.dto";
import { EndLeaseDto } from "./dto/end-lease.dto";
import { MarkLeasePaymentStatusDto } from "./dto/mark-lease-payment-status.dto";
import { RatingQueryDto } from "./dto/rating-query.dto";

@Injectable()
export class RentalV2Service {
  constructor(private readonly prisma: PrismaService) {}

  async getLeaseById(leaseId: string, actor: AuthContext) {
    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            status: true,
            landlordId: true,
            agentOwnerId: true,
            assignedAgentId: true,
          },
        },
      },
    });

    if (!lease) {
      throw new NotFoundException("Lease not found");
    }

    if (!this.canAccessLease(lease, actor)) {
      throw new ForbiddenException("Not authorized to view this lease");
    }

    return lease;
  }

  async listPropertyLeases(propertyId: string, actor: AuthContext) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        landlordId: true,
        agentOwnerId: true,
        assignedAgentId: true,
      },
    });

    if (!property) {
      throw new NotFoundException("Property not found");
    }

    const isOwnerOrManager =
      actor.role === Role.ADMIN ||
      property.landlordId === actor.userId ||
      property.agentOwnerId === actor.userId ||
      property.assignedAgentId === actor.userId;

    if (!isOwnerOrManager) {
      throw new ForbiddenException(
        "Not authorized to view leases for this listing",
      );
    }

    return this.prisma.lease.findMany({
      where: { propertyId },
      include: {
        tenant: { select: { id: true, name: true, email: true } },
        landlord: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  }

  async listMyLeases(actor: AuthContext) {
    return this.prisma.lease.findMany({
      where: {
        OR: [{ tenantId: actor.userId }, { landlordId: actor.userId }],
      },
      include: {
        property: {
          select: { id: true, title: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async endLeaseAndRepublish(
    leaseId: string,
    dto: EndLeaseDto,
    actor: AuthContext,
  ) {
    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        property: {
          select: {
            id: true,
            status: true,
            landlordId: true,
            agentOwnerId: true,
            assignedAgentId: true,
          },
        },
      },
    });

    if (!lease) {
      throw new NotFoundException("Lease not found");
    }

    const canEndLease =
      actor.role === Role.ADMIN ||
      lease.landlordId === actor.userId ||
      lease.property.agentOwnerId === actor.userId ||
      lease.property.assignedAgentId === actor.userId;

    if (!canEndLease) {
      throw new ForbiddenException("Only listing manager can end this lease");
    }

    if (lease.status !== LeaseStatus.ACTIVE) {
      throw new BadRequestException("Only ACTIVE leases can be ended");
    }

    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedLease = await tx.lease.update({
        where: { id: lease.id },
        data: {
          status: LeaseStatus.ENDED,
          endedAt: now,
          endDate: lease.endDate ?? now,
          terminationReason: dto.reason,
        },
      });

      let updatedPropertyStatus = lease.property.status;
      if (dto.republish) {
        const updatedProperty = await tx.property.update({
          where: { id: lease.propertyId },
          data: {
            status: PropertyStatus.PUBLISHED,
            availableFrom: now,
          },
          select: { status: true },
        });
        updatedPropertyStatus = updatedProperty.status;
      }

      return { updatedLease, updatedPropertyStatus };
    });

    return {
      lease: result.updatedLease,
      propertyStatus: result.updatedPropertyStatus,
      republished: Boolean(dto.republish),
    };
  }

  async createRentalRating(
    leaseId: string,
    dto: CreateRentalRatingDto,
    actor: AuthContext,
  ) {
    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        property: {
          select: {
            id: true,
            landlordId: true,
            agentOwnerId: true,
            assignedAgentId: true,
          },
        },
      },
    });

    if (!lease) {
      throw new NotFoundException("Lease not found");
    }

    if (lease.status !== LeaseStatus.ENDED) {
      throw new BadRequestException(
        "Ratings are allowed only after lease ends",
      );
    }

    const isTenant = lease.tenantId === actor.userId;
    const isLandlord = lease.landlordId === actor.userId;
    const isManager =
      lease.property.agentOwnerId === actor.userId ||
      lease.property.assignedAgentId === actor.userId;

    if (!isTenant && !isLandlord && !isManager && actor.role !== Role.ADMIN) {
      throw new ForbiddenException(
        "Only lease participants can rate this rental",
      );
    }

    if (dto.rateTarget === "TENANT") {
      if (!isLandlord && !isManager && actor.role !== Role.ADMIN) {
        throw new ForbiddenException(
          "Only landlord or manager can rate tenant",
        );
      }
      if (lease.tenantId === actor.userId) {
        throw new ForbiddenException("Cannot rate yourself");
      }

      return this.createRatingOnce({
        context: RatingContext.RENTAL,
        targetType: RatingTargetType.USER,
        targetId: lease.tenantId,
        leaseId: lease.id,
        propertyId: lease.propertyId,
        raterId: actor.userId,
        ratedUserId: lease.tenantId,
        score: dto.score,
        comment: dto.comment,
        isAnonymous: dto.isAnonymous ?? false,
      });
    }

    if (!isTenant) {
      throw new ForbiddenException("Only tenant can rate the property");
    }

    if (lease.landlordId === actor.userId) {
      throw new ForbiddenException("Cannot rate your own listing");
    }

    return this.createRatingOnce({
      context: RatingContext.RENTAL,
      targetType: RatingTargetType.LISTING,
      targetId: lease.propertyId,
      leaseId: lease.id,
      propertyId: lease.propertyId,
      raterId: actor.userId,
      score: dto.score,
      comment: dto.comment,
      isAnonymous: dto.isAnonymous ?? false,
    });
  }

  async createLeasePayment(
    leaseId: string,
    dto: CreateLeasePaymentDto,
    actor: AuthContext,
  ) {
    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
    });
    if (!lease) {
      throw new NotFoundException("Lease not found");
    }

    if (actor.userId !== lease.tenantId && actor.role !== Role.ADMIN) {
      throw new ForbiddenException(
        "Only tenant can submit this payment record",
      );
    }

    if (
      lease.status !== LeaseStatus.ACTIVE &&
      lease.status !== LeaseStatus.ENDED
    ) {
      throw new BadRequestException(
        "Payments can only be logged for active/ended leases",
      );
    }

    const paymentData: Record<string, unknown> = {
      leaseId: lease.id,
      propertyId: lease.propertyId,
      tenantId: lease.tenantId,
      landlordId: lease.landlordId,
      amount: dto.amount,
      currency: dto.currency,
      method: dto.method as RentPaymentMethod,
      status: dto.paidAt
        ? RentPaymentRecordStatus.PAID
        : RentPaymentRecordStatus.PENDING,
      isVerified: false,
    };

    if (dto.periodStart) paymentData.periodStart = dto.periodStart;
    if (dto.periodEnd) paymentData.periodEnd = dto.periodEnd;
    if (dto.dueDate) paymentData.dueDate = dto.dueDate;
    if (dto.paidAt) paymentData.paidAt = dto.paidAt;
    if (dto.reference) paymentData.reference = dto.reference;
    if (dto.proofUrl) paymentData.proofUrl = dto.proofUrl;
    if (dto.notes) paymentData.notes = dto.notes;

    return this.prisma.rentPayment.create({
      data: paymentData as any,
    });
  }

  async listMyRentPayments(actor: AuthContext) {
    return this.prisma.rentPayment.findMany({
      where: { tenantId: actor.userId },
      include: {
        property: { select: { id: true, title: true } },
        lease: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async markLeasePaymentStatus(
    paymentId: string,
    dto: MarkLeasePaymentStatusDto,
    actor: AuthContext,
  ) {
    const payment = await this.prisma.rentPayment.findUnique({
      where: { id: paymentId },
      include: {
        lease: {
          select: {
            id: true,
            landlordId: true,
            propertyId: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    const resolvedLandlordId = payment.landlordId ?? payment.lease?.landlordId;
    const isAllowed =
      actor.role === Role.ADMIN ||
      (resolvedLandlordId ? resolvedLandlordId === actor.userId : false);

    if (!isAllowed) {
      throw new ForbiddenException(
        "Only landlord or admin can confirm payment status",
      );
    }

    if (payment.status === RentPaymentRecordStatus.CANCELLED) {
      throw new BadRequestException("Cancelled payments cannot be updated");
    }

    const nextStatus =
      dto.status === "PAID"
        ? RentPaymentRecordStatus.PAID
        : RentPaymentRecordStatus.FAILED;

    const nextPaidAt =
      nextStatus === RentPaymentRecordStatus.PAID
        ? dto.paidAt ?? payment.paidAt ?? new Date()
        : null;

    const nextNotes = dto.note
      ? `${payment.notes ? `${payment.notes}\n` : ""}[${nextStatus}] ${dto.note}`
      : payment.notes;

    return this.prisma.rentPayment.update({
      where: { id: paymentId },
      data: {
        status: nextStatus,
        paidAt: nextPaidAt,
        isVerified: nextStatus === RentPaymentRecordStatus.PAID,
        notes: nextNotes,
      },
    });
  }

  async listMyLeaseOptions(actor: AuthContext) {
    const leases = await this.prisma.lease.findMany({
      where: {
        tenantId: actor.userId,
        status: { in: [LeaseStatus.ACTIVE, LeaseStatus.ENDED] },
      },
      include: {
        property: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return leases.map((lease: any) => ({
      id: lease.id,
      propertyId: lease.propertyId,
      title: lease.property.title,
      status: lease.status,
    }));
  }

  async listRatings(dto: RatingQueryDto, actor: AuthContext) {
    const where: any = {
      OR: [
        { raterId: actor.userId },
        { ratedUserId: actor.userId },
        {
          lease: {
            OR: [{ tenantId: actor.userId }, { landlordId: actor.userId }],
          },
        },
        {
          property: {
            OR: [{ landlordId: actor.userId }, { agentOwnerId: actor.userId }],
          },
        },
      ],
    };

    if (actor.role === Role.ADMIN) {
      delete where.OR;
    }

    if (dto.propertyId) {
      where.propertyId = dto.propertyId;
    }
    if (dto.leaseId) {
      where.leaseId = dto.leaseId;
    }
    if (dto.targetType && dto.targetId) {
      where.targetType = dto.targetType;
      where.targetId = dto.targetId;
    }

    const items = await this.prisma.rating.findMany({
      where,
      include: {
        rater: { select: { id: true, name: true, email: true } },
        property: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: dto.take ?? 50,
    });

    const total = items.length;
    const average =
      total > 0
        ? items.reduce((sum: number, item: any) => sum + item.score, 0) / total
        : 0;

    return {
      items,
      aggregate: {
        total,
        average: Number(average.toFixed(2)),
      },
    };
  }

  private canAccessLease(
    lease: {
      tenantId: string;
      landlordId: string;
      property: {
        landlordId: string | null;
        agentOwnerId: string | null;
        assignedAgentId: string | null;
      };
    },
    actor: AuthContext,
  ) {
    if (actor.role === Role.ADMIN) return true;
    if (lease.tenantId === actor.userId) return true;
    if (lease.landlordId === actor.userId) return true;
    if (lease.property.agentOwnerId === actor.userId) return true;
    if (lease.property.assignedAgentId === actor.userId) return true;
    return false;
  }

  private async createRatingOnce(data: {
    context: RatingContext;
    targetType: RatingTargetType;
    targetId: string;
    leaseId: string;
    propertyId: string;
    raterId: string;
    ratedUserId?: string;
    score: number;
    comment?: string;
    isAnonymous: boolean;
  }) {
    const existing = await this.prisma.rating.findFirst({
      where: {
        leaseId: data.leaseId,
        raterId: data.raterId,
        targetType: data.targetType,
        targetId: data.targetId,
      },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException("You have already submitted this rating");
    }

    return this.prisma.rating.create({
      data: {
        context: data.context,
        targetType: data.targetType,
        targetId: data.targetId,
        leaseId: data.leaseId,
        propertyId: data.propertyId,
        raterId: data.raterId,
        ratedUserId: data.ratedUserId,
        score: data.score,
        comment: data.comment,
        isAnonymous: data.isAnonymous,
      },
    });
  }
}
