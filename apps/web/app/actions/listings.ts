'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { serverApiRequest } from '@/lib/server-api';

export async function getInterestsForProperty(propertyId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    try {
        // TODO: Implement API endpoint
        // return await serverApiRequest(`/properties/${propertyId}/interests`);
        console.warn('[listings.ts] getInterestsForProperty - API endpoint not yet implemented');
        return [];
    } catch (error) {
        console.error('getInterestsForProperty error:', error);
        return [];
    }
}

export async function getChatThreads(propertyId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    try {
        // TODO: Implement API endpoint
        // return await serverApiRequest(`/properties/${propertyId}/chat-threads`);
        console.warn('[listings.ts] getChatThreads - API endpoint not yet implemented');
        return [];
    } catch (error) {
        console.error('getChatThreads error:', error);
        return [];
    }
}

export async function getThreadMessages(propertyId: string, counterpartyId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    try {
        // TODO: Implement API endpoint
        // return await serverApiRequest(`/properties/${propertyId}/messages/${counterpartyId}`);
        console.warn('[listings.ts] getThreadMessages - API endpoint not yet implemented');
        return [];
    } catch (error) {
        console.error('getThreadMessages error:', error);
        return [];
    }
}

export async function sendMessage(propertyId: string, recipientId: string, body: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    try {
        // TODO: Implement API endpoint
        // const msg = await serverApiRequest(`/properties/${propertyId}/messages`, {
        //     method: 'POST',
        //     body: { recipientId, body }
        // });
        console.warn('[listings.ts] sendMessage - API endpoint not yet implemented');

        revalidatePath(`/dashboard/listings/${propertyId}`);
        return { id: 'pending', body, propertyId, recipientId };
    } catch (error) {
        console.error('sendMessage error:', error);
        throw error;
    }
}

export async function updateInterestStatus(interestId: string, status: 'ACCEPTED' | 'REJECTED') {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    try {
        // TODO: Implement API endpoint
        // await serverApiRequest(`/interests/${interestId}`, { method: 'PATCH', body: { status } });
        console.warn('[listings.ts] updateInterestStatus - API endpoint not yet implemented');

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
        // TODO: Implement API endpoint
        // return await serverApiRequest(`/properties/${propertyId}/viewings`);
        console.warn('[listings.ts] getViewings - API endpoint not yet implemented');
        return [];
    } catch (error) {
        console.error('getViewings error:', error);
        return [];
    }
}
