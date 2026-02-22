import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateApplicationDto } from "./dto/create-application.dto";
import { UpdateApplicationStatusDto } from "./dto/update-application-status.dto";
import {
  ApplicationStatus,
  Prisma,
  Role,
  LeadSource,
  NotificationType,
} from "@prisma/client";
import { AuthContext } from "../auth/interfaces/auth-context.interface";
import { NotificationsService } from "../notifications/notifications.service";
import { DealsService } from "../deals/deals.service";
import { ConversationsService } from "../messaging/conversations.service";
import { ReferralsService } from "../growth/referrals/referrals.service";

@Injectable()
export class ApplicationsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private dealsService: DealsService,
    private conversationsService: ConversationsService,
    private referralsService: ReferralsService,
  ) {}

  async apply(userId: string, dto: CreateApplicationDto) {
    // 1. Check if property exists
    const property = await this.prisma.property.findUnique({
      where: { id: dto.propertyId },
    });
    if (!property) throw new NotFoundException("Property not found");

    // 2. Check duplicate
    const existing = await this.prisma.application.findUnique({
      where: {
        propertyId_userId: {
          propertyId: dto.propertyId,
          userId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        "You have already applied for this property",
      );
    }

    // 3. Create Application
    const application = await this.prisma.application.create({
      data: {
        propertyId: dto.propertyId,
        userId,
        notes: dto.notes,
        status: ApplicationStatus.SUBMITTED,
      },
    });

    // 4. Create/link Lead (Source: WEB/APPLICATION)
    await this.prisma.lead.create({
      data: {
        propertyId: dto.propertyId,
        userId,
        source: LeadSource.WEB,
        contactPhone: "PENDING",
        status: "NEW",
      },
    });

    // 5. Notify Owner (Async)
    const ownerId = property.landlordId || property.agentOwnerId;
    if (ownerId) {
      await this.notificationsService.notifyUser(
        ownerId,
        NotificationType.SYSTEM,
        "New Application Received",
        `A new application has been submitted for ${property.title ?? "your property"}.`,
        `/dashboard/listings/${property.id}/applications`,
      );
    }

    // 6. Create Conversation
    const ownerIdToContact = property.agentOwnerId || property.landlordId;
    if (ownerIdToContact) {
      await this.conversationsService.create(userId, {
        propertyId: dto.propertyId,
        applicationId: application.id,
        participantIds: [ownerIdToContact],
      });
    }

    // Growth: Qualify Referral for first application
    try {
      await this.referralsService.qualifyReferral(userId);
    } catch (e) {
      // Log but don't fail registration/application
    }

    return application;
  }

  async findReceivedApplications(userId: string) {
    return this.prisma.application.findMany({
      where: {
        property: {
          OR: [{ landlordId: userId }, { agentOwnerId: userId }],
        },
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            type: true,
            price: true,
            currency: true,
            media: { take: 1 },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            profilePhoto: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findMyApplications(userId: string) {
    return this.prisma.application.findMany({
      where: { userId },
      include: {
        property: {
          include: {
            media: { take: 1, orderBy: { order: "asc" } },
            city: true,
            suburb: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByProperty(propertyId: string, actor: AuthContext) {
    // Verify ownership
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });
    if (!property) throw new NotFoundException("Property not found");

    const isOwner =
      property.landlordId === actor.userId ||
      property.agentOwnerId === actor.userId;
    const isAdmin = actor.role === Role.ADMIN;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException("Access denied");
    }

    return this.prisma.application.findMany({
      where: { propertyId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            profilePhoto: true,
            trustScore: true,
            verificationScore: true,
            isVerified: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateStatus(
    id: string,
    dto: UpdateApplicationStatusDto,
    actor: AuthContext,
  ) {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: { property: true },
    });

    if (!application) throw new NotFoundException("Application not found");

    const isOwner =
      application.property.landlordId === actor.userId ||
      application.property.agentOwnerId === actor.userId;
    const isAdmin = actor.role === Role.ADMIN;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException("Access denied");
    }

    const noteSegments = [application.notes].filter(Boolean) as string[];
    if (dto.reason?.trim()) {
      noteSegments.push(`[Decision reason] ${dto.reason.trim()}`);
    }
    if (dto.nextStep) {
      noteSegments.push(`[Next step] ${dto.nextStep}`);
    }

    const updated = await this.prisma.application.update({
      where: { id },
      data: {
        status: dto.status,
        notes: noteSegments.length
          ? noteSegments.join("\n")
          : application.notes,
      },
    });

    // Loop into Deals
    if (dto.status === ApplicationStatus.APPROVED) {
      const existingDeal = await this.prisma.deal.findFirst({
        where: { applicationId: updated.id },
        select: { id: true },
      });
      if (!existingDeal) {
        await this.dealsService.createFromApplication(updated);
      }
    }

    // Notify Applicant
    await this.notificationsService.notifyUser(
      application.userId,
      NotificationType.SYSTEM,
      "Application Status Update",
      `Your application for ${application.property.title ?? "property"} is now ${dto.status}.${dto.reason ? ` Reason: ${dto.reason}` : ""}`,
      `/applications`,
    );

    return updated;
  }
}
