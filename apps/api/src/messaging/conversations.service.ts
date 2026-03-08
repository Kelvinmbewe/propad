import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ChatRequestStatus, ConversationType, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateConversationDto } from "./dto/create-conversation.dto";

@Injectable()
export class ConversationsService {
  constructor(private prisma: PrismaService) {}

  private isLaterDate(
    candidate?: Date | string | null,
    baseline?: Date | string | null,
  ) {
    const candidateAt = candidate ? new Date(candidate).getTime() : 0;
    const baselineAt = baseline ? new Date(baseline).getTime() : 0;
    return candidateAt > baselineAt;
  }

  private pickCanonicalConversations(userId: string, conversations: any[]) {
    const grouped = new Map<string, any>();

    for (const conversation of conversations) {
      if (conversation.type === ConversationType.VIEWING_CHAT) {
        grouped.set(`direct:${conversation.id}`, conversation);
        continue;
      }

      if (
        conversation.type !== ConversationType.LISTING_CHAT &&
        conversation.type !== ConversationType.GENERAL_CHAT
      ) {
        grouped.set(`direct:${conversation.id}`, conversation);
        continue;
      }

      const otherParticipantIds = (conversation.participants ?? [])
        .map((participant: any) => participant.userId ?? participant.user?.id)
        .filter((participantId: string | null | undefined) =>
          Boolean(participantId && participantId !== userId),
        )
        .sort();

      const counterpartKey = otherParticipantIds.join(":") || "no-counterpart";
      const key =
        conversation.type === ConversationType.LISTING_CHAT
          ? `${conversation.type}:${conversation.propertyId ?? conversation.property?.id ?? "no-property"}:${counterpartKey}`
          : `${conversation.type}:${conversation.pairKey ?? counterpartKey}`;
      const existing = grouped.get(key);

      if (!existing) {
        grouped.set(key, conversation);
        continue;
      }

      const candidateAt =
        conversation.lastMessageAt ??
        conversation.updatedAt ??
        conversation.createdAt;
      const existingAt =
        existing.lastMessageAt ?? existing.updatedAt ?? existing.createdAt;

      if (this.isLaterDate(candidateAt, existingAt)) {
        grouped.set(key, conversation);
      }
    }

    return Array.from(grouped.values());
  }

  private async resolveListingApplicantUserId(
    actorUserId: string,
    listingId: string,
    participantIds: string[],
    providedApplicantUserId?: string | null,
  ) {
    const normalizedProvidedApplicant = this.normalizeUserId(
      providedApplicantUserId,
    );
    if (normalizedProvidedApplicant) {
      return normalizedProvidedApplicant;
    }

    const property = await this.prisma.property.findUnique({
      where: { id: listingId },
      select: {
        landlordId: true,
        ownerId: true,
        agentOwnerId: true,
        assignedAgentId: true,
      },
    });

    const managerIds = new Set(
      [
        property?.landlordId,
        property?.ownerId,
        property?.agentOwnerId,
        property?.assignedAgentId,
      ].filter((entry): entry is string => Boolean(entry)),
    );

    const otherParticipantId =
      participantIds.find((participantId) => participantId !== actorUserId) ??
      null;

    if (managerIds.has(actorUserId)) {
      return otherParticipantId;
    }

    return actorUserId;
  }

  private normalizeUserId(candidate: unknown): string | null {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
    if (!candidate || typeof candidate !== "object") {
      return null;
    }
    const maybeUser = candidate as Record<string, unknown>;
    const nestedId =
      maybeUser.id ?? maybeUser.userId ?? maybeUser.profileId ?? maybeUser.sub;
    return typeof nestedId === "string" && nestedId.trim()
      ? nestedId.trim()
      : null;
  }

  private readonly conversationInclude = {
    property: {
      select: {
        id: true,
        title: true,
        price: true,
        currency: true,
        listingIntent: true,
        media: { take: 1, select: { url: true } },
        suburb: { select: { name: true } },
        city: { select: { name: true } },
      },
    },
    participants: {
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profilePhoto: true,
            role: true,
            trustScore: true,
            verificationScore: true,
          },
        },
      },
    },
    messages: {
      orderBy: { createdAt: "desc" as const },
      take: 1,
      include: {
        sender: {
          select: { id: true, name: true, profilePhoto: true },
        },
      },
    },
    chatRequest: true,
  };

  private async resolveRecipient(userId: string, dto: CreateConversationDto) {
    const directRecipient = dto.recipientId?.trim();
    if (directRecipient) return directRecipient;

    const participantCandidate = dto.participantIds?.find(
      (participantId) => participantId && participantId !== userId,
    );
    if (participantCandidate) return participantCandidate;

    const companyId = dto.companyId?.trim();
    if (!companyId) return null;

    const company = await this.prisma.company.findFirst({
      where: {
        OR: [{ id: companyId }, { agencyId: companyId }, { slug: companyId }],
      },
      select: { agencyId: true },
    });

    const agencyId = company?.agencyId ?? companyId;

    const member = await this.prisma.agencyMember.findFirst({
      where: {
        agencyId,
        userId: { not: userId },
        isActive: true,
      },
      orderBy: { joinedAt: "asc" },
      select: { userId: true },
    });

    if (member?.userId) {
      return member.userId;
    }

    const affiliatedUser = await this.prisma.userCompanyAffiliation.findFirst({
      where: {
        agencyId,
        userId: { not: userId },
        status: "APPROVED",
      },
      orderBy: { updatedAt: "desc" },
      select: { userId: true },
    });

    return affiliatedUser?.userId ?? null;
  }

  private async toConversationListItem(userId: string, conversation: any) {
    const participant = conversation.participants.find(
      (entry: any) => entry.userId === userId,
    );

    const lastReadAt = participant?.lastReadAt
      ? new Date(participant.lastReadAt)
      : null;

    const unreadCount = await this.prisma.message.count({
      where: {
        conversationId: conversation.id,
        senderId: { not: userId },
        createdAt: lastReadAt ? { gt: lastReadAt } : undefined,
      },
    });

    return {
      ...conversation,
      unreadCount,
    };
  }

  async create(userId: string, dto: CreateConversationDto) {
    const normalizedUserId = this.normalizeUserId(userId);
    if (!normalizedUserId) {
      throw new BadRequestException("Invalid user identity");
    }

    const listingId = dto.listingId?.trim() ?? dto.propertyId?.trim() ?? null;
    const viewingId = dto.viewingId?.trim() ?? null;
    const rawRecipientId = await this.resolveRecipient(normalizedUserId, dto);
    const recipientId = this.normalizeUserId(rawRecipientId);

    if (!listingId && !recipientId && dto.companyId?.trim()) {
      throw new BadRequestException("No available agency inbox recipient");
    }

    if (!listingId && !viewingId && !recipientId) {
      throw new BadRequestException(
        "Either listingId/propertyId, viewingId, or recipientId/companyId is required",
      );
    }

    if (recipientId && recipientId === normalizedUserId) {
      throw new BadRequestException("Cannot message yourself");
    }

    const cleanedParticipantIds = (dto.participantIds ?? [])
      .map((entry) => this.normalizeUserId(entry))
      .filter((entry): entry is string => Boolean(entry));

    const participantIds = Array.from(
      new Set([
        normalizedUserId,
        ...(recipientId ? [recipientId] : []),
        ...cleanedParticipantIds,
      ]),
    );

    const type = viewingId
      ? ConversationType.VIEWING_CHAT
      : listingId
        ? ConversationType.LISTING_CHAT
        : ConversationType.GENERAL_CHAT;

    const sortedPair = participantIds.slice().sort();
    const pairKey =
      type === ConversationType.GENERAL_CHAT && sortedPair.length >= 2
        ? `${sortedPair[0]}:${sortedPair[1]}`
        : null;

    const applicantUserId =
      type === ConversationType.LISTING_CHAT && listingId
        ? await this.resolveListingApplicantUserId(
            normalizedUserId,
            listingId,
            participantIds,
            dto.applicantUserId,
          )
        : null;

    const primaryCounterpartyId =
      participantIds.find(
        (participantId) => participantId !== normalizedUserId,
      ) ?? null;

    const uniqueWhere: Prisma.ConversationWhereInput =
      type === ConversationType.VIEWING_CHAT && viewingId
        ? { type, viewingId }
        : type === ConversationType.LISTING_CHAT &&
            listingId &&
            primaryCounterpartyId
          ? {
              type,
              propertyId: listingId,
              AND: [
                { participants: { some: { userId: normalizedUserId } } },
                { participants: { some: { userId: primaryCounterpartyId } } },
              ],
            }
          : type === ConversationType.LISTING_CHAT &&
              listingId &&
              applicantUserId
            ? { type, propertyId: listingId, applicantUserId }
            : type === ConversationType.GENERAL_CHAT && pairKey
              ? { type, pairKey }
              : {
                  type,
                  propertyId: listingId,
                  viewingId,
                  participants: {
                    some: {
                      userId: { in: participantIds },
                    },
                  },
                };

    const existing = await this.prisma.conversation.findFirst({
      where: uniqueWhere,
      include: this.conversationInclude,
      orderBy: { updatedAt: "desc" },
    });

    if (existing) {
      const existingParticipantIds = new Set(
        (existing.participants ?? []).map(
          (participant: any) => participant.userId,
        ),
      );
      const missingParticipantIds = participantIds.filter(
        (participantId) => !existingParticipantIds.has(participantId),
      );

      if (
        missingParticipantIds.length > 0 ||
        existing.applicantUserId !== applicantUserId
      ) {
        await this.prisma.conversation.update({
          where: { id: existing.id },
          data: {
            applicantUserId:
              applicantUserId ?? existing.applicantUserId ?? null,
            participants:
              missingParticipantIds.length > 0
                ? {
                    create: missingParticipantIds.map((participantId) => ({
                      userId: participantId,
                    })),
                  }
                : undefined,
          },
        });

        const reloadedExisting =
          await this.prisma.conversation.findUniqueOrThrow({
            where: { id: existing.id },
            include: this.conversationInclude,
          });

        return this.toConversationListItem(userId, reloadedExisting);
      }

      return this.toConversationListItem(userId, existing);
    }

    const created = await this.prisma.conversation.create({
      data: {
        propertyId: listingId,
        viewingId,
        applicantUserId,
        pairKey,
        requestStatus:
          type === ConversationType.GENERAL_CHAT ? "PENDING" : "ACCEPTED",
        dealId: dto.dealId?.trim() || null,
        applicationId: dto.applicationId?.trim() || null,
        type,
        participants: {
          create: participantIds.map((pid) => ({ userId: pid })),
        },
      },
      include: this.conversationInclude,
    });

    if (type === ConversationType.GENERAL_CHAT && recipientId) {
      await this.prisma.chatRequest.create({
        data: {
          conversationId: created.id,
          requesterId: normalizedUserId,
          recipientId,
          status: ChatRequestStatus.PENDING,
        },
      });
    }

    const reloaded = await this.prisma.conversation.findUniqueOrThrow({
      where: { id: created.id },
      include: this.conversationInclude,
    });

    return this.toConversationListItem(normalizedUserId, reloaded);
  }

  async findAll(
    userId: string,
    filters: { type?: string; status?: string; q?: string },
  ) {
    const normalizedUserId = this.normalizeUserId(userId);
    if (!normalizedUserId) {
      throw new BadRequestException("Invalid user identity");
    }

    const where: Prisma.ConversationWhereInput = {
      participants: {
        some: { userId: normalizedUserId },
      },
    };

    if (filters.type === "listing") {
      where.type = ConversationType.LISTING_CHAT;
    } else if (filters.type === "viewing") {
      where.type = ConversationType.VIEWING_CHAT;
    } else if (filters.type === "general") {
      where.type = ConversationType.GENERAL_CHAT;
    }

    if (filters.status === "requests") {
      where.chatRequest = {
        is: {
          recipientId: normalizedUserId,
          status: ChatRequestStatus.PENDING,
        },
      };
    }

    if (filters.q?.trim()) {
      const search = filters.q.trim();
      where.OR = [
        { property: { title: { contains: search, mode: "insensitive" } } },
        {
          participants: {
            some: {
              user: {
                name: { contains: search, mode: "insensitive" },
              },
            },
          },
        },
      ];
    }

    const conversations = await this.prisma.conversation.findMany({
      where,
      include: this.conversationInclude,
      orderBy: { lastMessageAt: "desc" },
    });

    const canonicalConversations = this.pickCanonicalConversations(
      normalizedUserId,
      conversations,
    );

    return Promise.all(
      canonicalConversations.map((conversation: any) =>
        this.toConversationListItem(normalizedUserId, conversation),
      ),
    );
  }

  async findOne(id: string, userId: string) {
    const normalizedUserId = this.normalizeUserId(userId);
    if (!normalizedUserId) {
      throw new BadRequestException("Invalid user identity");
    }

    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      include: this.conversationInclude,
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    const isParticipant = conversation.participants.some(
      (p: any) => p.userId === normalizedUserId,
    );
    if (!isParticipant) {
      throw new NotFoundException("Conversation not found");
    }

    return this.toConversationListItem(normalizedUserId, conversation);
  }

  async markRead(id: string, userId: string) {
    const normalizedUserId = this.normalizeUserId(userId);
    if (!normalizedUserId) {
      throw new BadRequestException("Invalid user identity");
    }

    const participant = await this.prisma.conversationParticipant.findFirst({
      where: {
        conversationId: id,
        userId: normalizedUserId,
      },
      select: { id: true },
    });

    if (!participant) {
      throw new NotFoundException("Conversation not found");
    }

    await this.prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: { lastReadAt: new Date() },
    });

    return { ok: true };
  }

  async acceptRequest(requestId: string, userId: string) {
    const normalizedUserId = this.normalizeUserId(userId);
    if (!normalizedUserId) {
      throw new BadRequestException("Invalid user identity");
    }

    const request = await this.prisma.chatRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.recipientId !== normalizedUserId) {
      throw new NotFoundException("Chat request not found");
    }

    const updated = await this.prisma.chatRequest.update({
      where: { id: requestId },
      data: { status: ChatRequestStatus.ACCEPTED },
    });

    await this.prisma.conversation.update({
      where: { id: request.conversationId },
      data: { requestStatus: "ACCEPTED" as any },
    });

    return updated;
  }

  async declineRequest(requestId: string, userId: string) {
    const normalizedUserId = this.normalizeUserId(userId);
    if (!normalizedUserId) {
      throw new BadRequestException("Invalid user identity");
    }

    const request = await this.prisma.chatRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.recipientId !== normalizedUserId) {
      throw new NotFoundException("Chat request not found");
    }

    if (request.status !== ChatRequestStatus.PENDING) {
      throw new ForbiddenException("Request is not pending");
    }

    return this.prisma.chatRequest.update({
      where: { id: requestId },
      data: { status: ChatRequestStatus.DECLINED },
    });
  }
}
