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
    const rawRecipientId = await this.resolveRecipient(normalizedUserId, dto);
    const recipientId = this.normalizeUserId(rawRecipientId);

    if (!listingId && !recipientId && dto.companyId?.trim()) {
      throw new BadRequestException("No available agency inbox recipient");
    }

    if (!listingId && !recipientId) {
      throw new BadRequestException(
        "Either listingId/propertyId or recipientId/companyId is required",
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

    const type = listingId
      ? ConversationType.LISTING_CHAT
      : ConversationType.GENERAL_CHAT;

    const whereBase: Prisma.ConversationWhereInput = {
      type,
      propertyId: listingId,
      dealId: dto.dealId?.trim() || null,
      applicationId: dto.applicationId?.trim() || null,
      participants: {
        some: {
          userId: { in: participantIds },
        },
      },
    };

    const candidates = await this.prisma.conversation.findMany({
      where: whereBase,
      include: this.conversationInclude,
      take: 30,
      orderBy: { updatedAt: "desc" },
    });

    const expectedKey = participantIds.sort().join(":");
    const existing = candidates.find((conversation: any) => {
      const activeParticipants = conversation.participants
        .filter((participant: any) => !participant.leftAt)
        .map((participant: any) => participant.userId)
        .sort()
        .join(":");
      return activeParticipants === expectedKey;
    });

    if (existing) {
      return this.toConversationListItem(userId, existing);
    }

    const created = await this.prisma.conversation.create({
      data: {
        propertyId: listingId,
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

    return Promise.all(
      conversations.map((conversation) =>
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

    return this.prisma.chatRequest.update({
      where: { id: requestId },
      data: { status: ChatRequestStatus.ACCEPTED },
    });
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
