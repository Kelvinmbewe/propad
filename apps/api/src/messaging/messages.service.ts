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

  async sendMessage(userId: string, dto: CreateMessageDto) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: dto.conversationId },
      include: {
        participants: true,
        chatRequest: true,
      },
    });

    if (!conversation) {
      throw new ForbiddenException("Access denied");
    }

    const isParticipant = conversation.participants.some(
      (participant: any) => participant.userId === userId,
    );

    if (!isParticipant) {
      throw new ForbiddenException("Access denied");
    }

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
        const canSendIntro = request.requesterId === userId && sentCount === 0;
        if (!canSendIntro) {
          throw new ForbiddenException(
            "Chat request is still pending approval",
          );
        }
      }
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId: dto.conversationId,
        senderId: userId,
        body: dto.body,
        attachments: dto.attachments as Prisma.InputJsonValue | undefined,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
      include: {
        sender: { select: { id: true, name: true, profilePhoto: true } },
      },
    });

    await this.prisma.conversation.update({
      where: { id: dto.conversationId },
      data: {
        lastMessageAt: message.createdAt,
        lastMessageId: message.id,
      },
    });

    await this.prisma.conversationParticipant.updateMany({
      where: {
        conversationId: dto.conversationId,
        userId,
      },
      data: {
        lastReadAt: message.createdAt,
      },
    });

    this.gateway.emitMessage(dto.conversationId, message);

    return message;
  }

  async getMessages(
    conversationId: string,
    userId: string,
    limit = 50,
    cursor?: string,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });

    if (
      !conversation ||
      !conversation.participants.some((p: any) => p.userId === userId)
    ) {
      throw new ForbiddenException();
    }

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        sender: { select: { id: true, name: true, profilePhoto: true } },
      },
    });

    await this.markRead(conversationId, userId);

    return messages.reverse();
  }

  async markRead(conversationId: string, userId: string) {
    const readAt = new Date();

    await this.prisma.message.updateMany({
      where: {
        conversationId,
        readAt: null,
        senderId: { not: userId },
      },
      data: { readAt },
    });

    await this.prisma.conversationParticipant.updateMany({
      where: {
        conversationId,
        userId,
      },
      data: { lastReadAt: readAt },
    });
  }
}
