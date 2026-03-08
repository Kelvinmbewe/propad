import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  Application,
  ContractMethod,
  ContractSnapshotFormat,
  DealStage,
  DealStatus,
  DealType,
  DealEventType,
  DealPartyRole,
  LeaseStatus,
  PropertyStatus,
  NotificationType,
  Prisma,
} from "@prisma/client";
import { NotificationsService } from "../notifications/notifications.service";
import { ConversationsService } from "../messaging/conversations.service";
import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { resolve, join } from "path";

import { ReferralsService } from "../growth/referrals/referrals.service";
import { hashContractSnapshot } from "./contract-hash";
import { inferDealTypeFromProperty } from "./deal-type";
import { renderDealContractTemplate } from "./contract-templates";

@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly conversationsService: ConversationsService,
    private readonly referralsService: ReferralsService,
  ) {}

  async createFromApplication(application: Application) {
    // 1. Validate
    const property = await this.prisma.property.findUnique({
      where: { id: application.propertyId },
    });
    if (!property) throw new NotFoundException("Property not found");

    if (
      property.status === PropertyStatus.RENTED ||
      property.status === PropertyStatus.SOLD
    ) {
      throw new BadRequestException("Property is already rented or sold");
    }

    // 2. Resolve roles
    // Tenant is the applicant
    const tenantId = application.userId;
    // Landlord is property owner
    const landlordId = property.landlordId || property.agentOwnerId;
    if (!landlordId) throw new BadRequestException("Property has no owner");
    // Agent is whatever agent is assigned ?? Or the agent owner?
    // Let's assume if agentOwnerId is set, they are the agent. Or if property has an assignment?
    // For simplicity, if agentOwnerId exists, they are agent. If landlordId exists, check assignments.
    // NOTE: Schema has `agentId` on Deal as optional.
    // Let's check assignments.
    const assignments = await this.prisma.agentAssignment.findMany({
      where: { propertyId: property.id },
      orderBy: { createdAt: "desc" },
      take: 1,
    });
    const agentId =
      assignments.length > 0
        ? assignments[0].agentId
        : property.agentOwnerId || null;

    const dealType = inferDealTypeFromProperty(property);
    const initialTemplateKey =
      dealType === DealType.RENT ? "ZW_RENT_V2" : "ZW_SALE_V2";

    // 3. Create Deal
    return this.prisma.$transaction(async (tx) => {
      const deal = await tx.deal.create({
        data: {
          propertyId: application.propertyId,
          tenantId: tenantId,
          landlordId: landlordId,
          agentId: agentId,
          applicationId: application.id,
          status: DealStatus.PENDING,
          dealType,
          stage: DealStage.DRAFT,
          // Auto-populated defaults from listing, manager can fine-tune later
          startDate: null,
          endDate: null,
          rentAmount: Number(property.price),
          currency: property.currency,
          depositAmount: null,
          contractTemplateKey: initialTemplateKey,
        },
      });

      await tx.dealEvent.create({
        data: {
          dealId: deal.id,
          type: DealEventType.APPLICATION_APPROVED,
          actorUserId: landlordId,
          metadata: {
            applicationId: application.id,
            propertyId: property.id,
          },
        },
      });

      // 4. Keep listing available while contract workflow is ongoing
      await tx.property.update({
        where: { id: property.id },
        data: {
          status: PropertyStatus.UNDER_OFFER,
        },
      });

      // 5. Notify parties
      // Notify Tenant
      await this.notificationsService.notifyUser(
        tenantId,
        NotificationType.SYSTEM,
        "Deal Started",
        "Your application has been approved. Review terms and sign the generated contract.",
        `/dashboard/deals/${deal.id}`,
      );

      // 6. Create Deal Conversation (or link existing?)
      // If application conversation exists, we might want to continue it or create a new one contextually linked to the Deal.
      // Requirement: "Auto-create Conversation on Deal creation"
      // Participants: Tenant (userId), Landlord (landlordId), Agent (agentId)

      const participants = [tenantId, landlordId];
      if (agentId) participants.push(agentId);

      await this.conversationsService.create(tenantId, {
        propertyId: property.id,
        applicantUserId: tenantId,
        dealId: deal.id,
        participantIds: participants,
      });

      // Growth: Qualify Referral for Agent (First Deal)
      if (agentId) {
        try {
          await this.referralsService.qualifyReferral(agentId);
        } catch (e) {
          /* ignore */
        }
      }

      // Growth: Qualify Referral for Tenant (First Deal is also a success)
      try {
        await this.referralsService.qualifyReferral(tenantId);
      } catch (e) {
        /* ignore */
      }

      return deal;
    });
  }

  async findMyDeals(userId: string) {
    return this.prisma.deal.findMany({
      where: {
        OR: [{ tenantId: userId }, { landlordId: userId }, { agentId: userId }],
      },
      include: {
        property: true,
        tenant: { select: { id: true, name: true, email: true } },
        landlord: { select: { id: true, name: true, email: true } },
        termsRent: true,
        termsSale: true,
        signatures: true,
        contractVersions: { orderBy: { versionInt: "desc" }, take: 5 },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string, userId: string) {
    const deal = await this.prisma.deal.findUnique({
      where: { id },
      include: {
        property: true,
        tenant: true,
        landlord: true,
        agent: true,
        application: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        termsRent: true,
        termsSale: true,
        signatures: true,
        contractFiles: { orderBy: { createdAt: "desc" } },
        contractVersions: { orderBy: { versionInt: "desc" } },
        events: { orderBy: { createdAt: "desc" }, take: 50 },
      },
    });
    if (!deal) throw new NotFoundException("Deal not found");

    // Check access
    if (
      deal.tenantId !== userId &&
      deal.landlordId !== userId &&
      deal.agentId !== userId
    ) {
      throw new NotFoundException("Deal not found"); // Hide access denied
    }

    return {
      ...deal,
      workflow: this.toWorkflowShape(deal),
    };
  }

  async findByApplication(applicationId: string, userId: string) {
    const deal = await this.prisma.deal.findFirst({
      where: { applicationId },
      orderBy: { createdAt: "desc" },
      include: {
        property: true,
        tenant: true,
        landlord: true,
        agent: true,
        application: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        termsRent: true,
        termsSale: true,
        signatures: true,
        contractFiles: { orderBy: { createdAt: "desc" } },
        contractVersions: { orderBy: { versionInt: "desc" } },
        events: { orderBy: { createdAt: "desc" }, take: 50 },
      },
    });

    if (!deal) {
      return null;
    }

    if (
      deal.tenantId !== userId &&
      deal.landlordId !== userId &&
      deal.agentId !== userId
    ) {
      throw new NotFoundException("Deal not found");
    }

    return {
      ...deal,
      workflow: this.toWorkflowShape(deal),
    };
  }

  async findContract(dealId: string, userId: string) {
    return this.findOne(dealId, userId);
  }

  async createOrGetFromApplication(applicationId: string, actorId: string) {
    const existing = await this.prisma.deal.findFirst({
      where: { applicationId },
      orderBy: { createdAt: "desc" },
    });
    if (existing) {
      return existing;
    }

    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        property: {
          select: {
            id: true,
            landlordId: true,
            agentOwnerId: true,
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException("Application not found");
    }

    const canManage =
      application.property.landlordId === actorId ||
      application.property.agentOwnerId === actorId;
    if (!canManage) {
      throw new ForbiddenException("Only listing managers can create deals");
    }

    return this.createFromApplication(application);
  }

  async updateWorkflow(
    dealId: string,
    actorId: string,
    payload: {
      stage?: "ACTIVE" | "COMPLETED" | "CANCELLED";
      terms?: Record<string, unknown>;
      dealType?: "RENT" | "SALE";
    },
  ) {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      include: { property: { select: { listingIntent: true } } },
    });
    if (!deal) throw new NotFoundException("Deal not found");

    const canManage = deal.landlordId === actorId || deal.agentId === actorId;
    if (!canManage) {
      throw new ForbiddenException(
        "Only listing managers can update contract workflow",
      );
    }

    const lockedDealType = inferDealTypeFromProperty(deal.property);
    if (payload.dealType && payload.dealType !== lockedDealType) {
      throw new BadRequestException(
        `Deal type is locked to ${lockedDealType} by listing intent`,
      );
    }

    if (payload.terms) {
      await this.saveDealTerms(dealId, actorId, payload.terms, lockedDealType);
    }

    if (payload.stage === "CANCELLED") {
      return this.prisma.deal.update({
        where: { id: dealId },
        data: { stage: DealStage.CANCELLED, status: DealStatus.CANCELLED },
      });
    }

    if (payload.stage === "COMPLETED") {
      return this.prisma.deal.update({
        where: { id: dealId },
        data: { status: DealStatus.COMPLETED },
      });
    }

    return this.findOne(dealId, actorId);
  }

  async saveDealTerms(
    dealId: string,
    actorId: string,
    terms: Record<string, unknown>,
    explicitDealType?: DealType,
  ) {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      include: { property: { select: { listingIntent: true } } },
    });
    if (!deal) throw new NotFoundException("Deal not found");

    const canManage = deal.landlordId === actorId || deal.agentId === actorId;
    if (!canManage) {
      throw new ForbiddenException("Only managers can set deal terms");
    }

    const lockedDealType =
      explicitDealType ?? inferDealTypeFromProperty(deal.property);
    const dealCurrency = String(terms.currency ?? deal.currency ?? "USD");
    const contractHtml =
      typeof terms.contractHtml === "string" ? terms.contractHtml : undefined;
    const contractMethod =
      terms.contractMethod === "UPLOAD"
        ? ContractMethod.UPLOAD
        : terms.contractMethod === "ESIGN"
          ? ContractMethod.ESIGN
          : undefined;

    if (lockedDealType === DealType.SALE) {
      const salePriceValue =
        terms.salePrice ?? terms.offerAmount ?? deal.rentAmount ?? 0;
      await this.prisma.dealTermsSale.upsert({
        where: { dealId },
        update: {
          salePrice: new Prisma.Decimal(String(salePriceValue ?? 0)),
          currency: dealCurrency as any,
          depositAmount: terms.deposit
            ? new Prisma.Decimal(String(terms.deposit))
            : null,
          closingDate: terms.transferDate
            ? new Date(String(terms.transferDate))
            : terms.startDate
              ? new Date(String(terms.startDate))
              : null,
          conditions: terms as Prisma.InputJsonValue,
          additionalTerms:
            typeof terms.conditions === "string"
              ? terms.conditions
              : typeof terms.specialTerms === "string"
                ? terms.specialTerms
                : null,
        },
        create: {
          dealId,
          salePrice: new Prisma.Decimal(String(salePriceValue ?? 0)),
          currency: dealCurrency as any,
          depositAmount: terms.deposit
            ? new Prisma.Decimal(String(terms.deposit))
            : null,
          closingDate: terms.transferDate
            ? new Date(String(terms.transferDate))
            : terms.startDate
              ? new Date(String(terms.startDate))
              : null,
          conditions: terms as Prisma.InputJsonValue,
          additionalTerms:
            typeof terms.conditions === "string"
              ? terms.conditions
              : typeof terms.specialTerms === "string"
                ? terms.specialTerms
                : null,
        },
      });
    } else {
      const rentAmountValue =
        terms.monthlyRent ?? terms.rentAmount ?? deal.rentAmount ?? 0;
      await this.prisma.dealTermsRent.upsert({
        where: { dealId },
        update: {
          rentAmount: new Prisma.Decimal(String(rentAmountValue ?? 0)),
          currency: dealCurrency as any,
          depositAmount: terms.deposit
            ? new Prisma.Decimal(String(terms.deposit))
            : null,
          leaseStartDate: terms.leaseStart
            ? new Date(String(terms.leaseStart))
            : terms.startDate
              ? new Date(String(terms.startDate))
              : null,
          leaseEndDate: terms.leaseEnd
            ? new Date(String(terms.leaseEnd))
            : terms.endDate
              ? new Date(String(terms.endDate))
              : null,
          paymentSchedule: terms.paymentDueDay
            ? String(terms.paymentDueDay)
            : null,
          utilitiesIncluded: terms as Prisma.InputJsonValue,
          additionalTerms:
            typeof terms.rules === "string"
              ? terms.rules
              : typeof terms.specialTerms === "string"
                ? terms.specialTerms
                : null,
        },
        create: {
          dealId,
          rentAmount: new Prisma.Decimal(String(rentAmountValue ?? 0)),
          currency: dealCurrency as any,
          depositAmount: terms.deposit
            ? new Prisma.Decimal(String(terms.deposit))
            : null,
          leaseStartDate: terms.leaseStart
            ? new Date(String(terms.leaseStart))
            : terms.startDate
              ? new Date(String(terms.startDate))
              : null,
          leaseEndDate: terms.leaseEnd
            ? new Date(String(terms.leaseEnd))
            : terms.endDate
              ? new Date(String(terms.endDate))
              : null,
          paymentSchedule: terms.paymentDueDay
            ? String(terms.paymentDueDay)
            : null,
          utilitiesIncluded: terms as Prisma.InputJsonValue,
          additionalTerms:
            typeof terms.rules === "string"
              ? terms.rules
              : typeof terms.specialTerms === "string"
                ? terms.specialTerms
                : null,
        },
      });
    }

    const updated = await this.prisma.deal.update({
      where: { id: dealId },
      data: {
        dealType: lockedDealType,
        stage: DealStage.TERMS_SET,
        currency: dealCurrency as any,
        rentAmount:
          lockedDealType === DealType.RENT
            ? Number(
                terms.monthlyRent ?? terms.rentAmount ?? deal.rentAmount ?? 0,
              )
            : Number(
                terms.salePrice ?? terms.offerAmount ?? deal.rentAmount ?? 0,
              ),
        depositAmount: terms.deposit
          ? Number(terms.deposit)
          : deal.depositAmount,
        startDate: terms.startDate
          ? new Date(String(terms.startDate))
          : terms.leaseStart
            ? new Date(String(terms.leaseStart))
            : deal.startDate,
        endDate: terms.endDate
          ? new Date(String(terms.endDate))
          : terms.leaseEnd
            ? new Date(String(terms.leaseEnd))
            : deal.endDate,
        rules: typeof terms.rules === "string" ? terms.rules : deal.rules,
        specialTerms:
          typeof terms.specialTerms === "string"
            ? terms.specialTerms
            : typeof terms.conditions === "string"
              ? terms.conditions
              : deal.specialTerms,
        contractHtml: contractHtml ?? deal.contractHtml,
        contractMethod: contractMethod ?? deal.contractMethod,
      },
    });

    return {
      ...updated,
      workflow: this.toWorkflowShape({
        ...updated,
        termsRent: await this.prisma.dealTermsRent.findUnique({
          where: { dealId },
        }),
        termsSale: await this.prisma.dealTermsSale.findUnique({
          where: { dealId },
        }),
        signatures: [],
        contractVersions: [],
        events: [],
      }),
    };
  }

  async generateContract(dealId: string, actorId: string) {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        property: true,
        tenant: { select: { id: true, name: true, email: true } },
        landlord: { select: { id: true, name: true, email: true } },
        agent: { select: { id: true, name: true, email: true } },
        termsRent: true,
        termsSale: true,
      },
    });
    if (!deal) throw new NotFoundException("Deal not found");

    const canManage = deal.landlordId === actorId || deal.agentId === actorId;
    if (!canManage) {
      throw new ForbiddenException("Only managers can generate contracts");
    }

    const generatableStages: DealStage[] = [
      DealStage.DRAFT,
      DealStage.TERMS_SET,
      DealStage.CONTRACT_READY,
    ];
    if (!generatableStages.includes(deal.stage)) {
      throw new BadRequestException(
        "Deal is not ready for contract generation",
      );
    }

    const dealType = deal.dealType ?? inferDealTypeFromProperty(deal.property);
    const templateFromDeal = deal.contractTemplateKey;
    const templateKey =
      templateFromDeal === "ZW_RENT_V1" || templateFromDeal === "ZW_RENT_V2"
        ? "ZW_RENT_V2"
        : templateFromDeal === "ZW_SALE_V1" || templateFromDeal === "ZW_SALE_V2"
          ? "ZW_SALE_V2"
          : dealType === DealType.RENT
            ? "ZW_RENT_V2"
            : "ZW_SALE_V2";
    const manager = deal.agent ?? deal.landlord;

    const snapshotText = renderDealContractTemplate(templateKey, {
      deal,
      property: deal.property,
      applicant: deal.tenant,
      manager,
    });

    await this.prisma.dealContractVersion.updateMany({
      where: { dealId, status: "DRAFT" },
      data: { status: "VOID" },
    });

    const latest = await this.prisma.dealContractVersion.findFirst({
      where: { dealId },
      orderBy: { versionInt: "desc" },
      select: { versionInt: true },
    });

    await this.prisma.dealContractVersion.create({
      data: {
        dealId,
        versionInt: (latest?.versionInt ?? 0) + 1,
        snapshotFormat: ContractSnapshotFormat.HTML,
        snapshotText,
        snapshotHash: hashContractSnapshot(snapshotText),
        status: "DRAFT",
      },
    });

    const updated = await this.prisma.deal.update({
      where: { id: dealId },
      data: {
        dealType,
        stage: DealStage.CONTRACT_READY,
        contractTemplateKey: templateKey,
        contractHtml: snapshotText,
      },
    });

    return this.findOne(updated.id, actorId);
  }

  async activateDeal(dealId: string, actorId: string) {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        property: true,
        signatures: true,
        termsRent: true,
        termsSale: true,
      },
    });
    if (!deal) throw new NotFoundException("Deal not found");

    const canManage = deal.landlordId === actorId || deal.agentId === actorId;
    if (!canManage) {
      throw new ForbiddenException("Only managers can activate deal");
    }

    if (deal.stage !== DealStage.SIGNED) {
      throw new BadRequestException("Deal must be signed before activation");
    }

    const applicantSigned = deal.signatures.some(
      (entry) => entry.role === DealPartyRole.APPLICANT,
    );
    const managerSigned = deal.signatures.some(
      (entry) => entry.role === DealPartyRole.LISTING_MANAGER,
    );
    if (!applicantSigned || !managerSigned) {
      throw new BadRequestException(
        "Both signatures are required before activation",
      );
    }

    const dealType = deal.dealType ?? inferDealTypeFromProperty(deal.property);

    const activated = await this.prisma.$transaction(async (tx) => {
      if (dealType === DealType.RENT) {
        const existingLease = await tx.lease.findFirst({
          where: {
            dealId: deal.id,
          },
          select: { id: true },
        });

        if (!existingLease) {
          await tx.lease.create({
            data: {
              propertyId: deal.propertyId,
              tenantId: deal.tenantId,
              landlordId: deal.landlordId,
              dealId: deal.id,
              status: LeaseStatus.ACTIVE,
              currency: deal.currency,
              rentAmount:
                deal.termsRent?.rentAmount ??
                new Prisma.Decimal(String(deal.rentAmount ?? 0)),
              depositAmount: deal.termsRent?.depositAmount ?? null,
              startDate: deal.termsRent?.leaseStartDate ?? deal.startDate,
              endDate: deal.termsRent?.leaseEndDate ?? deal.endDate,
              notes: deal.specialTerms ?? deal.termsRent?.additionalTerms,
            },
          });
        }

        await tx.property.update({
          where: { id: deal.propertyId },
          data: { status: PropertyStatus.RENTED },
        });
      } else {
        await tx.property.update({
          where: { id: deal.propertyId },
          data: { status: PropertyStatus.UNDER_OFFER },
        });
      }

      await tx.dealEvent.create({
        data: {
          dealId: deal.id,
          type: DealEventType.DEAL_CLOSED,
          actorUserId: actorId,
        },
      });

      return tx.deal.update({
        where: { id: deal.id },
        data: {
          stage: DealStage.ACTIVE,
          status: DealStatus.ACTIVE,
          activatedAt: new Date(),
          dealType,
        },
      });
    });

    return this.findOne(activated.id, actorId);
  }

  async findMyDealsQueue(
    userId: string,
    params: { q?: string; stage?: string; take?: number },
  ) {
    const take = Math.min(Math.max(params.take ?? 200, 1), 300);
    const search = params.q?.trim();

    const baseWhere: Prisma.DealWhereInput = {
      OR: [{ tenantId: userId }, { landlordId: userId }, { agentId: userId }],
    };

    if (params.stage && params.stage !== "ALL") {
      (baseWhere as any).stage = params.stage;
    }

    const deals = await this.prisma.deal.findMany({
      where: baseWhere,
      include: {
        property: { select: { id: true, title: true } },
        tenant: { select: { id: true, name: true, email: true } },
        landlord: { select: { id: true, name: true, email: true } },
        agent: { select: { id: true, name: true, email: true } },
        signatures: true,
        contractVersions: { orderBy: { versionInt: "desc" }, take: 1 },
        conversations: {
          include: {
            participants: {
              where: { userId },
              select: { lastReadAt: true },
            },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { senderId: true, createdAt: true },
            },
          },
          orderBy: { lastMessageAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
      take,
    });

    const rows = deals
      .map((deal) => {
        const stage = this.computeStage(deal as any);
        const unread = this.computeUnread(deal as any, userId);
        const overdue = this.computeOverdue(deal as any, stage);
        const nextAction = this.computeNextAction(stage);
        return {
          ...deal,
          stage,
          unread,
          overdue,
          nextAction,
          workflow: this.toWorkflowShape(deal as any),
        };
      })
      .filter((deal) => {
        if (!search) return true;
        const hay = [
          deal.property?.title,
          deal.tenant?.name,
          deal.tenant?.email,
          deal.landlord?.name,
          deal.landlord?.email,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(search.toLowerCase());
      });

    return {
      items: rows,
      total: rows.length,
      stats: {
        unread: rows.filter((item) => item.unread).length,
        overdue: rows.filter((item) => item.overdue).length,
      },
    };
  }

  async createContractVersion(
    dealId: string,
    actorId: string,
    payload: { snapshotFormat?: "HTML" | "MARKDOWN"; snapshotText: string },
  ) {
    const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) throw new NotFoundException("Deal not found");

    const canManage = deal.landlordId === actorId || deal.agentId === actorId;
    if (!canManage)
      throw new ForbiddenException(
        "Only managers can create contract versions",
      );

    const snapshotText = payload.snapshotText?.trim();
    if (!snapshotText) {
      throw new BadRequestException("Contract snapshot text is required");
    }

    const latestSigned = await this.prisma.dealContractVersion.findFirst({
      where: { dealId, status: "SIGNED" },
      orderBy: { versionInt: "desc" },
    });
    if (latestSigned) {
      await this.prisma.dealContractVersion.updateMany({
        where: { dealId, status: "SENT" },
        data: { status: "VOID" },
      });
    }

    const latest = await this.prisma.dealContractVersion.findFirst({
      where: { dealId },
      orderBy: { versionInt: "desc" },
      select: { versionInt: true },
    });
    const versionInt = (latest?.versionInt ?? 0) + 1;
    const snapshotHash = hashContractSnapshot(snapshotText);

    const version = await this.prisma.dealContractVersion.create({
      data: {
        dealId,
        versionInt,
        snapshotFormat:
          (payload.snapshotFormat as ContractSnapshotFormat | undefined) ??
          ContractSnapshotFormat.HTML,
        snapshotText,
        snapshotHash,
        status: "DRAFT",
      },
    });

    return version;
  }

  async sendContract(dealId: string, actorId: string, versionId?: string) {
    const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) throw new NotFoundException("Deal not found");
    const canManage = deal.landlordId === actorId || deal.agentId === actorId;
    if (!canManage)
      throw new ForbiddenException("Only managers can send contracts");

    const sendableStages: DealStage[] = [
      DealStage.CONTRACT_READY,
      DealStage.TERMS_SET,
      DealStage.DRAFT,
    ];

    if (!sendableStages.includes(deal.stage)) {
      throw new BadRequestException("Deal is not ready to send contract");
    }

    const version = versionId
      ? await this.prisma.dealContractVersion.findUnique({
          where: { id: versionId },
        })
      : await this.prisma.dealContractVersion.findFirst({
          where: { dealId, status: "DRAFT" },
          orderBy: { versionInt: "desc" },
        });
    if (!version || version.dealId !== dealId) {
      throw new NotFoundException("Contract version not found");
    }
    if (version.status !== "DRAFT") {
      throw new BadRequestException("Only draft contract versions can be sent");
    }

    await this.prisma.dealContractVersion.updateMany({
      where: { dealId, status: "SENT" },
      data: { status: "VOID" },
    });

    await this.prisma.dealContractVersion.update({
      where: { id: version.id },
      data: { status: "SENT" },
    });
    await this.prisma.dealEvent.create({
      data: {
        dealId,
        type: DealEventType.CONTRACT_SENT,
        actorUserId: actorId,
        metadata: { versionId: version.id, versionInt: version.versionInt },
      },
    });

    await this.prisma.deal.update({
      where: { id: dealId },
      data: {
        stage: DealStage.SENT,
        contractSentAt: new Date(),
      },
    });

    await this.notificationsService.notifyUser(
      deal.tenantId,
      NotificationType.SYSTEM,
      "Contract Ready to Sign",
      "A contract has been sent for your signature.",
      `/dashboard/deals/${dealId}/contract`,
    );

    return { ok: true, versionId: version.id };
  }

  async approveDeal(dealId: string, actorId: string) {
    const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) throw new NotFoundException("Deal not found");
    const canManage = deal.landlordId === actorId || deal.agentId === actorId;
    if (!canManage)
      throw new ForbiddenException("Only managers can approve deal");

    return this.activateDeal(dealId, actorId);
  }

  async rejectDeal(dealId: string, actorId: string, reason?: string) {
    const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) throw new NotFoundException("Deal not found");
    const canManage = deal.landlordId === actorId || deal.agentId === actorId;
    if (!canManage)
      throw new ForbiddenException("Only managers can reject deal");

    const updated = await this.prisma.deal.update({
      where: { id: dealId },
      data: { status: DealStatus.CANCELLED },
    });
    await this.prisma.dealEvent.create({
      data: {
        dealId,
        type: DealEventType.DEAL_CANCELLED,
        actorUserId: actorId,
        metadata: reason ? ({ reason } as Prisma.InputJsonValue) : undefined,
      },
    });
    return updated;
  }

  async signDeal(
    dealId: string,
    actorId: string,
    payload: { fullName: string; agreed: boolean },
  ) {
    if (!payload.agreed || !payload.fullName?.trim()) {
      throw new BadRequestException(
        "Signature agreement and full name are required",
      );
    }

    const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) {
      throw new NotFoundException("Deal not found");
    }

    const isManager = deal.landlordId === actorId || deal.agentId === actorId;
    const isApplicant = deal.tenantId === actorId;
    if (!isManager && !isApplicant) {
      throw new NotFoundException("Deal not found");
    }

    const signableStages: DealStage[] = [
      DealStage.SENT,
      DealStage.SIGNING,
      DealStage.SIGNED,
      DealStage.ACTIVE,
    ];
    if (!signableStages.includes(deal.stage)) {
      throw new BadRequestException("Deal is not in a signable stage");
    }

    const isUploadFlow = deal.contractMethod === ContractMethod.UPLOAD;
    const latestVersion = await this.prisma.dealContractVersion.findFirst({
      where: { dealId },
      orderBy: { versionInt: "desc" },
    });
    const sentVersion = await this.prisma.dealContractVersion.findFirst({
      where: { dealId, status: "SENT" },
      orderBy: { versionInt: "desc" },
    });
    if (!isUploadFlow && !sentVersion) {
      throw new BadRequestException(
        "No sent contract version available to sign",
      );
    }
    if (isUploadFlow) {
      const uploadCount = await this.prisma.dealContractFile.count({
        where: { dealId },
      });
      if (uploadCount === 0) {
        throw new BadRequestException(
          "Upload a signed contract file before confirming signatures",
        );
      }
    }

    const role = isApplicant
      ? DealPartyRole.APPLICANT
      : DealPartyRole.LISTING_MANAGER;
    const signedAt = new Date();

    const existingSignature = await this.prisma.dealSignature.findFirst({
      where: {
        dealId,
        role,
        signedByUserId: actorId,
      },
      select: { id: true },
    });

    const signatureData = {
      fullName: payload.fullName.trim(),
      agreed: true,
      versionId: sentVersion?.id ?? latestVersion?.id ?? null,
      versionInt: sentVersion?.versionInt ?? latestVersion?.versionInt ?? null,
      snapshotHash:
        sentVersion?.snapshotHash ?? latestVersion?.snapshotHash ?? null,
      method: isUploadFlow ? "UPLOAD" : "ESIGN",
    };

    if (existingSignature) {
      await this.prisma.dealSignature.update({
        where: { id: existingSignature.id },
        data: {
          signedAt,
          signatureData,
        },
      });
    } else {
      await this.prisma.dealSignature.create({
        data: {
          dealId,
          role,
          signedByUserId: actorId,
          signedAt,
          signatureData,
        },
      });
    }

    const signatures = await this.prisma.dealSignature.findMany({
      where: {
        dealId,
        role: { in: [DealPartyRole.APPLICANT, DealPartyRole.LISTING_MANAGER] },
      },
      select: { role: true, signedAt: true, signatureData: true },
    });
    const signaturesForSentVersion = signatures.filter((entry: any) => {
      if (isUploadFlow) {
        return true;
      }
      const signatureData =
        entry.signatureData && typeof entry.signatureData === "object"
          ? (entry.signatureData as Record<string, unknown>)
          : null;
      return signatureData?.versionId === sentVersion?.id;
    });
    const applicantSigned = signaturesForSentVersion.some(
      (entry) => entry.role === DealPartyRole.APPLICANT,
    );
    const managerSigned = signaturesForSentVersion.some(
      (entry) => entry.role === DealPartyRole.LISTING_MANAGER,
    );
    const bothSigned = applicantSigned && managerSigned;

    await this.prisma.dealEvent.create({
      data: {
        dealId,
        type: isApplicant
          ? DealEventType.SIGNED_BY_APPLICANT
          : DealEventType.SIGNED_BY_MANAGER,
        actorUserId: actorId,
        metadata: {
          versionId: sentVersion?.id ?? latestVersion?.id ?? null,
          versionInt:
            sentVersion?.versionInt ?? latestVersion?.versionInt ?? null,
          signedAt,
          method: isUploadFlow ? "UPLOAD" : "ESIGN",
        },
      },
    });

    if (bothSigned) {
      if (sentVersion) {
        await this.prisma.dealContractVersion.update({
          where: { id: sentVersion.id },
          data: {
            status: "SIGNED",
            snapshotHash: hashContractSnapshot(sentVersion.snapshotText),
          },
        });
      }
      await this.prisma.deal.update({
        where: { id: dealId },
        data: {
          stage: DealStage.SIGNED,
          ...(isUploadFlow
            ? {}
            : {
                contractMethod: ContractMethod.ESIGN,
                sealedMethod: ContractMethod.ESIGN,
                sealedAt: new Date(),
              }),
        },
      });
    } else if (!deal.sealedAt) {
      await this.prisma.deal.update({
        where: { id: dealId },
        data: {
          stage: DealStage.SIGNING,
        },
      });
    }

    return this.findOne(dealId, actorId);
  }

  async uploadContractFile(
    dealId: string,
    actorId: string,
    actorRole: string,
    file: {
      filename: string;
      mimetype: string;
      sizeBytes: number;
      buffer: Buffer;
    },
  ) {
    const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) {
      throw new NotFoundException("Deal not found");
    }

    const isParticipant =
      deal.tenantId === actorId ||
      deal.landlordId === actorId ||
      deal.agentId === actorId;
    const isStaff = ["ADMIN", "VERIFIER", "MODERATOR"].includes(actorRole);
    if (!isParticipant && !isStaff) {
      throw new NotFoundException("Deal not found");
    }

    const allowedMimes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        "Only PDF, PNG, and JPEG files are allowed",
      );
    }

    const uploadsRoot = this.resolveUploadsRoot();
    const uploadsDir = join(uploadsRoot, "deals", dealId, "contracts");
    await mkdir(uploadsDir, { recursive: true });

    const safeName = file.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueName = `${Date.now()}-${safeName}`;
    const storagePath = `deals/${dealId}/contracts/${uniqueName}`;
    const filePath = join(uploadsRoot, storagePath);
    await writeFile(filePath, file.buffer as Uint8Array);

    const uploaded = await this.prisma.dealContractFile.create({
      data: {
        dealId,
        uploadedByUserId: actorId,
        filename: file.filename,
        mimeType: file.mimetype,
        sizeBytes: file.sizeBytes,
        storagePath,
      },
    });

    await this.prisma.deal.update({
      where: { id: dealId },
      data: {
        contractMethod: ContractMethod.UPLOAD,
      },
    });

    return {
      id: uploaded.id,
      filename: uploaded.filename,
      mimeType: uploaded.mimeType,
      sizeBytes: uploaded.sizeBytes,
      storagePath: uploaded.storagePath,
      url: `/uploads/${uploaded.storagePath}`,
      createdAt: uploaded.createdAt,
    };
  }

  async sealDeal(
    dealId: string,
    actorId: string,
    actorRole: string,
    method?: "ESIGN" | "UPLOAD",
  ) {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        signatures: true,
        contractFiles: true,
        contractVersions: { orderBy: { versionInt: "desc" }, take: 1 },
      },
    });
    if (!deal) {
      throw new NotFoundException("Deal not found");
    }

    const isManager = deal.landlordId === actorId || deal.agentId === actorId;
    const isStaff = ["ADMIN", "VERIFIER", "MODERATOR"].includes(actorRole);
    if (!isManager && !isStaff) {
      throw new ForbiddenException("Only managers can seal contracts");
    }

    const chosen =
      method === "UPLOAD" ? ContractMethod.UPLOAD : ContractMethod.ESIGN;

    if (chosen === ContractMethod.UPLOAD && deal.contractFiles.length === 0) {
      throw new BadRequestException("Upload a signed contract file first");
    }

    const applicantSigned = deal.signatures.some(
      (entry: any) => entry.role === DealPartyRole.APPLICANT,
    );
    const managerSigned = deal.signatures.some(
      (entry: any) => entry.role === DealPartyRole.LISTING_MANAGER,
    );

    if (chosen === ContractMethod.ESIGN) {
      if (!applicantSigned || !managerSigned) {
        throw new BadRequestException("Both parties must sign first");
      }
    }

    if (
      chosen === ContractMethod.UPLOAD &&
      (!applicantSigned || !managerSigned)
    ) {
      throw new BadRequestException(
        "Both parties must confirm the uploaded contract before sealing",
      );
    }

    const latestVersion = deal.contractVersions?.[0] ?? null;
    if (chosen === ContractMethod.ESIGN && latestVersion?.status === "SENT") {
      await this.prisma.dealContractVersion.update({
        where: { id: latestVersion.id },
        data: {
          status: "SIGNED",
          snapshotHash: hashContractSnapshot(latestVersion.snapshotText),
        },
      });
    }

    await this.prisma.deal.update({
      where: { id: dealId },
      data: {
        contractMethod: chosen,
        sealedMethod: chosen,
        sealedAt: new Date(),
        stage: DealStage.SIGNED,
      },
    });

    return this.findOne(dealId, actorId);
  }

  private resolveUploadsRoot() {
    const runtimeCwd = process.env.INIT_CWD ?? process.env.PWD ?? ".";
    const candidates = [
      process.env.UPLOADS_DIR,
      resolve(runtimeCwd, "uploads"),
      resolve(runtimeCwd, "apps", "api", "uploads"),
      resolve(runtimeCwd, "..", "uploads"),
      resolve(runtimeCwd, "..", "..", "uploads"),
    ].filter((value): value is string => !!value);

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    return resolve(runtimeCwd, "uploads");
  }

  private toWorkflowShape(deal: any) {
    const latestVersion = deal.contractVersions?.[0] ?? null;
    const signatures = {
      manager:
        deal.signatures?.find(
          (entry: any) => entry.role === DealPartyRole.LISTING_MANAGER,
        ) ?? null,
      applicant:
        deal.signatures?.find(
          (entry: any) => entry.role === DealPartyRole.APPLICANT,
        ) ?? null,
    };

    const terms = deal.termsRent
      ? {
          monthlyRent: String(deal.termsRent.rentAmount ?? ""),
          deposit: String(deal.termsRent.depositAmount ?? ""),
          leaseStart: deal.termsRent.leaseStartDate,
          leaseEnd: deal.termsRent.leaseEndDate,
          paymentDueDay: deal.termsRent.paymentSchedule,
          rules: deal.rules ?? deal.termsRent.additionalTerms,
          specialTerms: deal.specialTerms ?? null,
        }
      : deal.termsSale
        ? {
            salePrice: String(deal.termsSale.salePrice ?? ""),
            deposit: String(deal.termsSale.depositAmount ?? ""),
            transferDate: deal.termsSale.closingDate,
            conditions: deal.specialTerms ?? deal.termsSale.additionalTerms,
            specialTerms: deal.specialTerms ?? null,
          }
        : {};

    return {
      stage: this.computeStage(deal),
      dealType:
        deal.dealType ??
        (deal.termsSale ? "SALE" : deal.termsRent ? "RENT" : null),
      terms,
      contractHtml: latestVersion?.snapshotText ?? deal.contractHtml ?? null,
      contractHash: latestVersion?.snapshotHash ?? null,
      contractVersionStatus: latestVersion?.status ?? null,
      contractMethod: deal.contractMethod ?? null,
      sealedAt: deal.sealedAt ?? null,
      sealedMethod: deal.sealedMethod ?? null,
      contractFiles:
        deal.contractFiles?.map((file: any) => ({
          id: file.id,
          filename: file.filename,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
          storagePath: file.storagePath,
          url: `/uploads/${file.storagePath}`,
          createdAt: file.createdAt,
          uploadedByUserId: file.uploadedByUserId,
        })) ?? [],
      signatures,
      events: deal.events ?? [],
      migratedToV2At: deal.migratedToV2At ?? null,
      sentAt: deal.contractSentAt ?? null,
      activatedAt: deal.activatedAt ?? null,
    };
  }

  private computeStage(deal: any): string {
    if (deal.stage) return String(deal.stage);
    if (deal.status === DealStatus.CANCELLED) return DealStage.CANCELLED;
    if (deal.status === DealStatus.ACTIVE) return DealStage.ACTIVE;

    const latestVersion = deal.contractVersions?.[0] ?? null;
    if (latestVersion?.status === "SIGNED") return DealStage.SIGNED;
    if (latestVersion?.status === "SENT") return DealStage.SENT;
    if (deal.termsRent || deal.termsSale) return DealStage.TERMS_SET;
    return DealStage.DRAFT;
  }

  private computeNextAction(stage: string): string {
    if (stage === DealStage.DRAFT) return "Set terms";
    if (stage === DealStage.TERMS_SET) return "Generate contract";
    if (stage === DealStage.CONTRACT_READY) return "Send to sign";
    if (stage === DealStage.SENT || stage === DealStage.SIGNING)
      return "Collect signatures";
    if (stage === DealStage.SIGNED) return "Activate";
    return "-";
  }

  private computeOverdue(deal: any, stage: string): boolean {
    const reference = deal.contractSentAt ?? deal.updatedAt ?? deal.createdAt;
    if (!reference) return false;
    const ageMs = Date.now() - new Date(reference).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (stage === DealStage.SENT || stage === DealStage.SIGNING) {
      return ageDays > 3;
    }
    if (stage === DealStage.CONTRACT_READY || stage === DealStage.TERMS_SET) {
      return ageDays > 2;
    }
    return false;
  }

  private computeUnread(deal: any, userId: string): boolean {
    const conversation = deal.conversations?.[0];
    if (!conversation) return false;
    const participant = conversation.participants?.[0];
    const latestMessage = conversation.messages?.[0];
    if (!latestMessage) return false;
    if (latestMessage.senderId === userId) return false;
    if (!participant?.lastReadAt) return true;
    return new Date(latestMessage.createdAt) > new Date(participant.lastReadAt);
  }
}
