'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function submitRating(targetUserId: string, propertyId: string, rating: number, comment: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    // Create review
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
}

export async function getPropertyRatings(propertyId: string) {
    // Get ratings associated with the property (reviews of landlord or agent by tenants of this property)
    // This is getting a bit complex with the schema relations, simplifying to find reviews LINKED to this propertyId
    return prisma.userReview.findMany({
        where: { propertyId },
        include: {
            reviewer: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
}

export async function computeTrustScore(userId: string) {
    // 1. Verification status (Verified = +30)
    const verification = await prisma.verification.findFirst({
        where: { userId, status: 'VERIFIED' } // Simplified, usually check for ID verification specifically
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
    // Mocking deals count for now or using distinct properties where user is landlord with status SOLD/RENTED
    const completedDealsCount = 0; // TODO: Implement deal tracking
    const dealScore = Math.min(completedDealsCount * 2, 20);

    const totalScore = (verification ? 30 : 0) + ratingScore + dealScore;
    return Math.min(totalScore, 100); // Max 100
}
