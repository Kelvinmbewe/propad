'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { serverApiRequest } from '@/lib/server-api';

export async function submitRating(targetUserId: string, propertyId: string, rating: number, comment: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    try {
        await serverApiRequest(`/properties/${propertyId}/ratings`, {
            method: 'POST',
            body: { rating, comment, type: 'EXTERNAL' }
        });

        revalidatePath(`/dashboard/listings/${propertyId}`);
        return {
            id: 'submitted',
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
        return await serverApiRequest(`/properties/${propertyId}/ratings`);
    } catch (error) {
        console.error('getPropertyRatings error:', error);
        return [];
    }
}

export async function computeTrustScore(userId: string) {
    try {
        const result = await serverApiRequest<{ score: number }>(`/trust/score`);
        return result.score;
    } catch (error) {
        console.error('computeTrustScore error:', error);
        return 0;
    }
}
