'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { serverApiRequest } from '@/lib/server-api';

export interface FeaturedListing {
    id: string;
    listingId: string;
    startsAt: Date | string;
    endsAt: Date | string;
    priorityLevel: number;
    status: string;
}

export async function getFeaturedStatus(listingId: string): Promise<FeaturedListing | null> {
    try {
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');

        // TODO: Implement API endpoint
        // return await serverApiRequest<FeaturedListing>(`/listings/${listingId}/featured`);
        console.warn('[featured.ts] getFeaturedStatus - API endpoint not yet implemented');
        return null;
    } catch (error) {
        console.error('getFeaturedStatus error:', error);
        return null;
    }
}

export async function createFeaturedListing(listingId: string, durationDays: number, priorityLevel: number = 1): Promise<FeaturedListing> {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    try {
        const startsAt = new Date();
        const endsAt = new Date();
        endsAt.setDate(startsAt.getDate() + durationDays);

        // TODO: Implement API endpoint
        // const featured = await serverApiRequest<FeaturedListing>('/featured-listings', {
        //     method: 'POST',
        //     body: { listingId, startsAt, endsAt, priorityLevel }
        // });
        console.warn('[featured.ts] createFeaturedListing - API endpoint not yet implemented');

        revalidatePath(`/dashboard/listings/${listingId}`);
        return {
            id: 'pending',
            listingId,
            startsAt,
            endsAt,
            priorityLevel,
            status: 'PENDING_PAYMENT'
        };
    } catch (error) {
        console.error('createFeaturedListing error:', error);
        throw new Error('Unable to create featured listing at this time');
    }
}

export async function completeFeaturedPayment(featuredId: string): Promise<void> {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    try {
        // TODO: Implement API endpoint
        // await serverApiRequest(`/featured-listings/${featuredId}/complete`, { method: 'POST' });
        console.warn('[featured.ts] completeFeaturedPayment - API endpoint not yet implemented');

        revalidatePath('/dashboard/listings');
    } catch (error) {
        console.error('completeFeaturedPayment error:', error);
        throw new Error('Unable to complete payment at this time');
    }
}
