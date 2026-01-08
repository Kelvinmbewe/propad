'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { serverApiRequest } from '@/lib/server-api';

export async function submitRating(targetUserId: string, propertyId: string, rating: number, comment: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    try {
        // TODO: Implement API endpoint
        // const review = await serverApiRequest('/reviews', {
        //     method: 'POST',
        //     body: { targetUserId, propertyId, rating, comment }
        // });
        console.warn('[ratings.ts] submitRating - API endpoint not yet implemented');

        revalidatePath(`/dashboard/listings/${propertyId}`);
        return {
            id: 'pending',
            reviewerId: session.user.id,
            revieweeId: targetUserId,
            propertyId,
            rating,
            comment
        };
    } catch (error) {
        console.error('submitRating error:', error);
        throw new Error('Unable to submit rating at this time');
    }
}

export async function getPropertyRatings(propertyId: string) {
    try {
        // TODO: Implement API endpoint
        // return await serverApiRequest(`/properties/${propertyId}/ratings`);
        console.warn('[ratings.ts] getPropertyRatings - API endpoint not yet implemented');
        return [];
    } catch (error) {
        console.error('getPropertyRatings error:', error);
        return [];
    }
}

export async function computeTrustScore(userId: string) {
    try {
        // TODO: Implement API endpoint
        // const result = await serverApiRequest(`/users/${userId}/trust-score`);
        // return result.score;
        console.warn('[ratings.ts] computeTrustScore - API endpoint not yet implemented');
        return 0;
    } catch (error) {
        console.error('computeTrustScore error:', error);
        return 0;
    }
}
