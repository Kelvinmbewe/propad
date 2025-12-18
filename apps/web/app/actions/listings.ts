'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function getInterestsForProperty(propertyId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    // Verify ownership or agent assignment
    const property = await prisma.property.findFirst({
        where: {
            id: propertyId,
            OR: [
                { landlordId: session.user.id },
                { agentOwnerId: session.user.id }
            ]
        }
    });

    if (!property) throw new Error('Property not found or access denied');

    return prisma.interest.findMany({
        where: { propertyId },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    isVerified: true,
                    image: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
}

export async function getChatThreads(propertyId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    // Verify access
    const property = await prisma.property.findFirst({
        where: {
            id: propertyId,
            OR: [
                { landlordId: session.user.id },
                { agentOwnerId: session.user.id }
            ]
        }
    });

    if (!property) throw new Error('Access denied');

    // Group messages by counterparty
    // This is a bit complex in Prisma, manual grouping might be needed or raw query
    // For now, let's fetch all messages and group in memory (not efficient for huge chats but fine for MVP)
    const messages = await prisma.propertyMessage.findMany({
        where: { propertyId },
        orderBy: { createdAt: 'desc' },
        include: {
            sender: { select: { id: true, name: true, image: true } },
            recipient: { select: { id: true, name: true, image: true } }
        }
    });

    const threads = new Map();

    messages.forEach(msg => {
        const isMe = msg.senderId === session.user.id;
        const counterparty = isMe ? msg.recipient : msg.sender;
        const threadId = counterparty.id;

        if (!threads.has(threadId)) {
            threads.set(threadId, {
                user: counterparty,
                lastMessage: msg,
                unreadCount: (!isMe && !msg.readAt) ? 1 : 0
            });
        } else {
            // Update stats if needed (already ordered by desc, so first is lastMessage)
            if (!isMe && !msg.readAt) {
                const t = threads.get(threadId);
                t.unreadCount++;
            }
        }
    });

    return Array.from(threads.values());
}

export async function getThreadMessages(propertyId: string, counterpartyId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    return prisma.propertyMessage.findMany({
        where: {
            propertyId,
            OR: [
                { senderId: session.user.id, recipientId: counterpartyId },
                { senderId: counterpartyId, recipientId: session.user.id }
            ]
        },
        orderBy: { createdAt: 'asc' },
        include: {
            sender: { select: { id: true, name: true, image: true } }
        }
    });
}

export async function sendMessage(propertyId: string, recipientId: string, body: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    const msg = await prisma.propertyMessage.create({
        data: {
            propertyId,
            senderId: session.user.id,
            recipientId,
            body
        }
    });

    revalidatePath(`/dashboard/listings/${propertyId}`);
    return msg;
}

export async function updateInterestStatus(interestId: string, status: 'ACCEPTED' | 'REJECTED') {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');
    // TODO: Verify ownership of property

    await prisma.interest.update({
        where: { id: interestId },
        data: { status }
    });

    revalidatePath('/dashboard/listings');
}
