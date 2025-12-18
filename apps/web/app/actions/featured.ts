'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function getFeaturedStatus(listingId: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');

        return await prisma.featuredListing.findFirst({
            where: { listingId },
            orderBy: { endsAt: 'desc' }
        });
    } catch (error) {
        console.error('getFeaturedStatus error:', error);
        return null; // Return null instead of throwing to prevent 500
    }
}

export async function createFeaturedListing(listingId: string, durationDays: number, priorityLevel: number = 1) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    try {
        const startsAt = new Date();
        const endsAt = new Date();
        endsAt.setDate(startsAt.getDate() + durationDays);

        const featured = await prisma.featuredListing.create({
            data: {
                listingId,
                startsAt,
                endsAt,
                priorityLevel,
                status: 'PENDING_PAYMENT'
            }
        });

        revalidatePath(`/dashboard/listings/${listingId}`);
        return featured;
    } catch (error) {
        console.error('createFeaturedListing error:', error);
        throw new Error('Unable to create featured listing at this time');
    }
}

export async function completeFeaturedPayment(featuredId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    try {
        await prisma.featuredListing.update({
            where: { id: featuredId },
            data: { status: 'ACTIVE' }
        });

        revalidatePath('/dashboard/listings');
    } catch (error) {
        console.error('completeFeaturedPayment error:', error);
        throw new Error('Unable to complete payment at this time');
    }
}
