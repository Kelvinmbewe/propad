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

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { agencyId: true },
    });

    if (!company?.agencyId) {
      return null;
    }

    const member = await this.prisma.agencyMember.findFirst({
      where: {
        agencyId: company.agencyId,
        userId: { not: userId },
      },
      orderBy: { joinedAt: "asc" },
      select: { userId: true },
    });

    return member?.userId ?? null;
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
    const listingId = dto.listingId?.trim() ?? dto.propertyId?.trim() ?? null;
    const recipientId = await this.resolveRecipient(userId, dto);

    if (!listingId && !recipientId) {
      throw new BadRequestException(
        "Either listingId/propertyId or recipientId/companyId is required",
      );
    }

    if (recipientId && recipientId === userId) {
      throw new BadRequestException("Cannot message yourself");
    }

    const participantIds = Array.from(
      new Set([userId, ...(recipientId ? [recipientId] : [])]),
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
          requesterId: userId,
          recipientId,
          status: ChatRequestStatus.PENDING,
        },
      });
    }

    const reloaded = await this.prisma.conversation.findUniqueOrThrow({
      where: { id: created.id },
      include: this.conversationInclude,
    });

    return this.toConversationListItem(userId, reloaded);
  }

  async findAll(
    userId: string,
    filters: { type?: string; status?: string; q?: string },
  ) {
    const where: Prisma.ConversationWhereInput = {
      participants: {
        some: { userId },
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
          recipientId: userId,
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
        this.toConversationListItem(userId, conversation),
      ),
    );
  }

  async findOne(id: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      include: this.conversationInclude,
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    const isParticipant = conversation.participants.some(
      (p: any) => p.userId === userId,
    );
    if (!isParticipant) {
      throw new NotFoundException("Conversation not found");
    }

    return this.toConversationListItem(userId, conversation);
  }

  async markRead(id: string, userId: string) {
    const participant = await this.prisma.conversationParticipant.findFirst({
      where: {
        conversationId: id,
        userId,
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
    const request = await this.prisma.chatRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.recipientId !== userId) {
      throw new NotFoundException("Chat request not found");
    }

    return this.prisma.chatRequest.update({
      where: { id: requestId },
      data: { status: ChatRequestStatus.ACCEPTED },
    });
  }

  async declineRequest(requestId: string, userId: string) {
    const request = await this.prisma.chatRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.recipientId !== userId) {
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
