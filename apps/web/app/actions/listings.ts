'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { serverApiRequest } from '@/lib/server-api';

export interface PropertyInterestUser {
    id: string;
    name: string | null;
    email: string | null;
    isVerified: boolean | null;
}

export interface PropertyInterest {
    id: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    offerAmount: number | string | null;
    message: string | null;
    user: PropertyInterestUser;
}

export interface PropertyViewing {
    id: string;
    propertyId: string;
    viewerId: string;
    agentId: string | null;
    landlordId: string | null;
    scheduledAt: string;
    status: string;
    notes: string | null;
    locationLat: number | null;
    locationLng: number | null;
    createdAt: string;
    updatedAt: string;
    viewer: {
        id: string;
        name: string | null;
        phone: string | null;
    };
    agent: {
        id: string;
        name: string | null;
    } | null;
    landlord: {
        id: string;
        name: string | null;
    } | null;
}

export async function getInterestsForProperty(propertyId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    try {
        return await serverApiRequest<PropertyInterest[]>(`/properties/${propertyId}/interests`);
    } catch (error) {
        console.error('getInterestsForProperty error:', error);
        return [] as PropertyInterest[];
    }
}

export async function getChatThreads(propertyId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    try {
        const messages = await serverApiRequest<any[]>(`/properties/${propertyId}/messages`);
        const threads = new Map<string, { user: any; lastMessage: any; unreadCount: number }>();

        for (const message of messages) {
            const isSender = message.senderId === session.user.id;
            const counterparty = isSender ? message.recipient : message.sender;
            if (!counterparty) continue;

            const existing = threads.get(counterparty.id);
            const unreadCount = !isSender && !message.readAt ? 1 : 0;

            if (!existing || new Date(message.createdAt) > new Date(existing.lastMessage.createdAt)) {
                threads.set(counterparty.id, {
                    user: counterparty,
                    lastMessage: message,
                    unreadCount: (existing?.unreadCount ?? 0) + unreadCount
                });
            } else if (unreadCount) {
                threads.set(counterparty.id, {
                    ...existing,
                    unreadCount: existing.unreadCount + unreadCount
                });
            }
        }

        return Array.from(threads.values()).sort((a, b) =>
            new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
        );
    } catch (error) {
        console.error('getChatThreads error:', error);
        return [];
    }
}

export async function getThreadMessages(propertyId: string, counterpartyId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    try {
        const messages = await serverApiRequest<any[]>(`/properties/${propertyId}/messages`);
        return messages.filter((message) =>
            (message.senderId === session.user.id && message.recipientId === counterpartyId)
            || (message.senderId === counterpartyId && message.recipientId === session.user.id)
        );
    } catch (error) {
        console.error('getThreadMessages error:', error);
        return [];
    }
}

export async function sendMessage(propertyId: string, recipientId: string, body: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    try {
        const msg = await serverApiRequest(`/properties/${propertyId}/messages`, {
            method: 'POST',
            body: { body }
        });
        revalidatePath(`/dashboard/listings/${propertyId}`);
        return msg;
    } catch (error) {
        console.error('sendMessage error:', error);
        throw error;
    }
}

export async function updateInterestStatus(interestId: string, status: 'ACCEPTED' | 'REJECTED') {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    try {
        await serverApiRequest(`/interests/${interestId}/status`, { method: 'PATCH', body: { status } });

        revalidatePath('/dashboard/listings');
    } catch (error) {
        console.error('updateInterestStatus error:', error);
        throw error;
    }
}

export async function getViewings(propertyId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    try {
        return await serverApiRequest<PropertyViewing[]>(`/properties/${propertyId}/viewings`);
    } catch (error) {
        console.error('getViewings error:', error);
        return [] as PropertyViewing[];
    }
}
