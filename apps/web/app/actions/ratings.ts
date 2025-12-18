'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function submitRating(targetUserId: string, propertyId: string, rating: number, comment: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    try {
        const review = await prisma.userReview.create({
            data: {
                reviewerId: session.user.id,
                revieweeId: targetUserId,
                propertyId,
                rating,
                comment
            }
        });

        revalidatePath(`/dashboard/listings/${propertyId}`);
        return review;
    } catch (error) {
        console.error('submitRating error:', error);
        throw new Error('Unable to submit rating at this time');
    }
}

export async function getPropertyRatings(propertyId: string) {
    try {
        return await prisma.userReview.findMany({
            where: { propertyId },
            include: {
                reviewer: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    } catch (error) {
        console.error('getPropertyRatings error:', error);
        return []; // Return empty array instead of throwing to prevent 500
    }
}

export async function computeTrustScore(userId: string) {
    try {
        // 1. Verification status (Approved = +30)
        const verification = await prisma.verification.findFirst({
            where: { requesterId: userId, status: 'APPROVED' }
        });

        // 2. Ratings average (0-5 stars -> 0-50 points)
        const reviews = await prisma.userReview.findMany({
            where: { revieweeId: userId }
        });

        let ratingScore = 0;
        if (reviews.length > 0) {
            const avg = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;
            ratingScore = avg * 10;
        }

        // 3. Completed deals (Each deal = +2 points, max 20)
        const completedDealsCount = 0;
        const dealScore = Math.min(completedDealsCount * 2, 20);

        const totalScore = (verification ? 30 : 0) + ratingScore + dealScore;
        return Math.min(totalScore, 100);
    } catch (error) {
        console.error('computeTrustScore error:', error);
        return 0; // Return 0 score on error
    }
}
