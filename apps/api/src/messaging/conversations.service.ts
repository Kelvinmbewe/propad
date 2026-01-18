
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { Conversation } from '@prisma/client';

@Injectable()
export class ConversationsService {
    constructor(private prisma: PrismaService) { }

    async create(userId: string, dto: CreateConversationDto) {
        // 1. Check if conversation exists for this context
        const whereClause: any = {
            propertyId: dto.propertyId,
        };
        if (dto.dealId) whereClause.dealId = dto.dealId;
        if (dto.applicationId) whereClause.applicationId = dto.applicationId;

        // Check strict participant match if needed, but for now allow multiple conversations per property?
        // User Requirement: "participants-only access", "Auto-create on Application/Deal"
        // Ideally 1 conversation per (Property, User, Agent)?

        // Simplification: Check if a conversation exists involving these participants for this property
        // For now, just create new if not found by ID.
        // If applicationId is passed, ensure uniqueness.
        if (dto.applicationId) {
            const existing = await this.prisma.conversation.findFirst({
                where: { applicationId: dto.applicationId }
            });
            if (existing) return existing;
        }

        if (dto.dealId) {
            const existing = await this.prisma.conversation.findFirst({
                where: { dealId: dto.dealId }
            });
            if (existing) return existing;
        }

        // Participants: userId (creator) + dto.participantIds
        const participantIds = Array.from(new Set([userId, ...dto.participantIds]));

        return this.prisma.conversation.create({
            data: {
                propertyId: dto.propertyId,
                dealId: dto.dealId,
                applicationId: dto.applicationId,
                participants: {
                    create: participantIds.map(pid => ({ userId: pid }))
                }
            },
            include: { participants: true }
        });
    }

    async findAll(userId: string) {
        return this.prisma.conversation.findMany({
            where: {
                participants: {
                    some: { userId }
                }
            },
            include: {
                property: {
                    select: { id: true, title: true, media: { take: 1 } }
                },
                participants: {
                    include: {
                        user: { select: { id: true, name: true, profilePhoto: true, role: true } }
                    }
                },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            },
            orderBy: { lastMessageAt: 'desc' }
        });
    }

    async findOne(id: string, userId: string) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id },
            include: {
                property: true,
                participants: {
                    include: {
                        user: { select: { id: true, name: true, profilePhoto: true, role: true } }
                    }
                }
            }
        });

        if (!conversation) throw new NotFoundException('Conversation not found');

        // Security Guard
        const isParticipant = conversation.participants.some((p: any) => p.userId === userId);
        if (!isParticipant) throw new NotFoundException('Conversation not found');

        return conversation;
    }
}
