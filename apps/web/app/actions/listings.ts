'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function getInterestsForProperty(propertyId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    try {
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

        return await prisma.interest.findMany({
            where: { propertyId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        isVerified: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    } catch (error) {
        console.error('getInterestsForProperty error:', error);
        return []; // Return empty array to prevent 500
    }
}

export async function getChatThreads(propertyId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    try {
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

        const messages = await prisma.propertyMessage.findMany({
            where: { propertyId },
            orderBy: { createdAt: 'desc' },
            include: {
                sender: { select: { id: true, name: true } },
                recipient: { select: { id: true, name: true } }
            }
        });

        const threads = new Map();

        messages.forEach((msg: any) => {
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
                if (!isMe && !msg.readAt) {
                    const t = threads.get(threadId);
                    t.unreadCount++;
                }
            }
        });

        return Array.from(threads.values());
    } catch (error) {
        console.error('getChatThreads error:', error);
        return []; // Return empty array to prevent 500
    }
}

export async function getThreadMessages(propertyId: string, counterpartyId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    try {
        return await prisma.propertyMessage.findMany({
            where: {
                propertyId,
                OR: [
                    { senderId: session.user.id, recipientId: counterpartyId },
                    { senderId: counterpartyId, recipientId: session.user.id }
                ]
            },
            orderBy: { createdAt: 'asc' },
            include: {
                sender: { select: { id: true, name: true } }
            }
        });
    } catch (error) {
        console.error('getThreadMessages error:', error);
        return []; // Return empty array to prevent 500
    }
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

    await prisma.interest.update({
        where: { id: interestId },
        data: { status }
    });

    revalidatePath('/dashboard/listings');
}

export async function getViewings(propertyId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    try {
        const property = await prisma.property.findFirst({
            where: { id: propertyId, OR: [{ landlordId: session.user.id }, { agentOwnerId: session.user.id }] }
        });
        if (!property) throw new Error('Access denied');

        return await prisma.viewing.findMany({
            where: { propertyId },
            include: {
                viewer: { select: { id: true, name: true, phone: true } },
                agent: { select: { id: true, name: true } },
                landlord: { select: { id: true, name: true } }
            },
            orderBy: { scheduledAt: 'asc' }
        });
    } catch (error) {
        console.error('getViewings error:', error);
        return []; // Return empty array to prevent 500
    }
}
