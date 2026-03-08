import { ForbiddenException, Injectable } from "@nestjs/common";
import { ChatRequestStatus, ConversationType, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateMessageDto } from "./dto/create-message.dto";
import { MessagingGateway } from "./messaging.gateway";

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private gateway: MessagingGateway,
  ) {}

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

  private buildCounterpartyKey(participantIds: string[], userId: string) {
    return participantIds
      .filter((participantId) => participantId !== userId)
      .sort()
      .join(":");
  }

  private async resolveConversationFamilyIds(
    conversation: {
      id: string;
      type: ConversationType;
      propertyId?: string | null;
      pairKey?: string | null;
      participants: Array<{ userId: string }>;
    },
    userId: string,
  ) {
    if (conversation.type === ConversationType.LISTING_CHAT) {
      if (!conversation.propertyId) {
        return [conversation.id];
      }

      const counterpartyIds = Array.from(
        new Set(
          conversation.participants
            .map((participant) => participant.userId)
            .filter((participantId) => participantId !== userId),
        ),
      ).sort();

      const whereAnd: Prisma.ConversationWhereInput[] = [
        { participants: { some: { userId } } },
        ...counterpartyIds.map((counterpartyId) => ({
          participants: { some: { userId: counterpartyId } },
        })),
      ];

      const family = await this.prisma.conversation.findMany({
        where: {
          type: ConversationType.LISTING_CHAT,
          propertyId: conversation.propertyId,
          AND: whereAnd,
        },
        select: {
          id: true,
          lastMessageAt: true,
          participants: { select: { userId: true } },
        },
        orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
      });

      const targetCounterpartyKey = this.buildCounterpartyKey(
        conversation.participants.map((participant) => participant.userId),
        userId,
      );

      const canonicalFamily = family.filter((entry) => {
        const entryCounterpartyKey = this.buildCounterpartyKey(
          entry.participants.map((participant) => participant.userId),
          userId,
        );
        return entryCounterpartyKey === targetCounterpartyKey;
      });

      return canonicalFamily.length > 0
        ? canonicalFamily.map((entry) => entry.id)
        : [conversation.id];
    }

    if (conversation.type === ConversationType.GENERAL_CHAT) {
      const counterpartyIds = Array.from(
        new Set(
          conversation.participants
            .map((participant) => participant.userId)
            .filter((participantId) => participantId !== userId),
        ),
      ).sort();

      if (counterpartyIds.length === 0) {
        return [conversation.id];
      }

      const whereAnd: Prisma.ConversationWhereInput[] = [
        { participants: { some: { userId } } },
        ...counterpartyIds.map((counterpartyId) => ({
          participants: { some: { userId: counterpartyId } },
        })),
      ];

      const family = await this.prisma.conversation.findMany({
        where: {
          type: ConversationType.GENERAL_CHAT,
          pairKey: conversation.pairKey ?? undefined,
          AND: whereAnd,
        },
        select: {
          id: true,
          pairKey: true,
          lastMessageAt: true,
          participants: { select: { userId: true } },
        },
        orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
      });

      const targetCounterpartyKey = this.buildCounterpartyKey(
        conversation.participants.map((participant) => participant.userId),
        userId,
      );

      const canonicalFamily = family.filter((entry) => {
        const entryCounterpartyKey = this.buildCounterpartyKey(
          entry.participants.map((participant) => participant.userId),
          userId,
        );
        return (
          entryCounterpartyKey === targetCounterpartyKey &&
          (conversation.pairKey ? entry.pairKey === conversation.pairKey : true)
        );
      });

      return canonicalFamily.length > 0
        ? canonicalFamily.map((entry) => entry.id)
        : [conversation.id];
    }

    return [conversation.id];
  }

  async sendMessage(userId: string, dto: CreateMessageDto) {
    const normalizedUserId = this.normalizeUserId(userId);
    if (!normalizedUserId) {
      throw new ForbiddenException("Access denied");
    }

    const requestedConversation = await this.prisma.conversation.findUnique({
      where: { id: dto.conversationId },
      include: {
        participants: true,
        chatRequest: true,
      },
    });

    if (!requestedConversation) {
      throw new ForbiddenException("Access denied");
    }

    const isParticipant = requestedConversation.participants.some(
      (participant: any) => participant.userId === normalizedUserId,
    );

    if (!isParticipant) {
      throw new ForbiddenException("Access denied");
    }

    const familyConversationIds = await this.resolveConversationFamilyIds(
      requestedConversation,
      normalizedUserId,
    );
    const canonicalConversationId =
      familyConversationIds[0] ?? dto.conversationId;

    const conversation =
      canonicalConversationId === requestedConversation.id
        ? requestedConversation
        : await this.prisma.conversation.findUniqueOrThrow({
            where: { id: canonicalConversationId },
            include: {
              participants: true,
              chatRequest: true,
            },
          });

    if (
      conversation.type === ConversationType.GENERAL_CHAT &&
      conversation.chatRequest
    ) {
      const request = conversation.chatRequest;
      if (request.status === ChatRequestStatus.BLOCKED) {
        throw new ForbiddenException("This conversation is blocked");
      }
      if (request.status === ChatRequestStatus.DECLINED) {
        throw new ForbiddenException("Chat request was declined");
      }
      if (request.status === ChatRequestStatus.PENDING) {
        const sentCount = await this.prisma.message.count({
          where: { conversationId: conversation.id },
        });
        const canSendIntro =
          request.requesterId === normalizedUserId && sentCount === 0;
        if (!canSendIntro) {
          throw new ForbiddenException(
            "Chat request is still pending approval",
          );
        }
      }
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: normalizedUserId,
        body: dto.body,
        attachments: dto.attachments as Prisma.InputJsonValue | undefined,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
      include: {
        sender: { select: { id: true, name: true, profilePhoto: true } },
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: message.createdAt,
        lastMessageId: message.id,
      },
    });

    await this.prisma.conversationParticipant.updateMany({
      where: {
        conversationId: conversation.id,
        userId: normalizedUserId,
      },
      data: {
        lastReadAt: message.createdAt,
      },
    });

    this.gateway.emitMessage(conversation.id, message);

    return message;
  }

  async getMessages(
    conversationId: string,
    userId: string,
    limit = 50,
    cursor?: string,
  ) {
    const normalizedUserId = this.normalizeUserId(userId);
    if (!normalizedUserId) {
      throw new ForbiddenException();
    }

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });

    if (
      !conversation ||
      !conversation.participants.some((p: any) => p.userId === normalizedUserId)
    ) {
      throw new ForbiddenException();
    }

    const familyConversationIds = await this.resolveConversationFamilyIds(
      conversation,
      normalizedUserId,
    );

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId: { in: familyConversationIds },
      },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        sender: { select: { id: true, name: true, profilePhoto: true } },
      },
    });

    await this.markRead(conversationId, normalizedUserId);

    return messages.reverse();
  }

  async markRead(conversationId: string, userId: string) {
    const normalizedUserId = this.normalizeUserId(userId);
    if (!normalizedUserId) {
      throw new ForbiddenException();
    }

    const readAt = new Date();

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });

    if (
      !conversation ||
      !conversation.participants.some(
        (participant) => participant.userId === normalizedUserId,
      )
    ) {
      throw new ForbiddenException();
    }

    const familyConversationIds = await this.resolveConversationFamilyIds(
      conversation,
      normalizedUserId,
    );

    await this.prisma.message.updateMany({
      where: {
        conversationId: { in: familyConversationIds },
        readAt: null,
        senderId: { not: normalizedUserId },
      },
      data: { readAt },
    });

    await this.prisma.conversationParticipant.updateMany({
      where: {
        conversationId: { in: familyConversationIds },
        userId: normalizedUserId,
      },
      data: { lastReadAt: readAt },
    });
  }
}
