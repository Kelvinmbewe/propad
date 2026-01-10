
import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessagingGateway } from './messaging.gateway';

@Injectable()
export class MessagesService {
    constructor(
        private prisma: PrismaService,
        private gateway: MessagingGateway
    ) { }

    async sendMessage(userId: string, dto: CreateMessageDto) {
        // 1. Verify membership
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: dto.conversationId },
            include: { participants: true }
        });
        if (!conversation) throw new ForbiddenException('Access denied');

        const isParticipant = conversation.participants.some(p => p.userId === userId);
        if (!isParticipant) throw new ForbiddenException('Access denied');

        // 2. Create Message
        const message = await this.prisma.message.create({
            data: {
                conversationId: dto.conversationId,
                senderId: userId,
                body: dto.body
            },
            include: { sender: { select: { id: true, name: true, profilePhoto: true } } }
        });

        // 3. Update Conversation
        await this.prisma.conversation.update({
            where: { id: dto.conversationId },
            data: { lastMessageAt: new Date() }
        });

        // 4. Emit Real-time Event
        this.gateway.emitMessage(dto.conversationId, message);

        return message;
    }

    async getMessages(conversationId: string, userId: string, limit = 50, cursor?: string) {
        // Check access
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { participants: true }
        });
        if (!conversation || !conversation.participants.some(p => p.userId === userId)) {
            throw new ForbiddenException();
        }

        const messages = await this.prisma.message.findMany({
            where: { conversationId },
            take: limit,
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor } : undefined,
            orderBy: { createdAt: 'desc' },
            include: { sender: { select: { id: true, name: true, profilePhoto: true } } }
        });

        // Mark as read
        await this.markRead(conversationId, userId);

        return messages.reverse();
    }

    async markRead(conversationId: string, userId: string) {
        await this.prisma.conversationParticipant.update({
            where: {
                conversationId_userId: { conversationId, userId }
            },
            data: { lastReadAt: new Date() }
        });
    }
}
