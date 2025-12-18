'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function getFeaturedStatus(listingId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    return prisma.featuredListing.findFirst({
        where: { listingId },
        orderBy: { endsAt: 'desc' } // Get latest
    });
}

export async function createFeaturedListing(listingId: string, durationDays: number, priorityLevel: number = 1) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    // In a real app, this would be preceded by a payment confirmation
    // For now, we'll create it with PENDING_PAYMENT status
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
}

// Mock payment completion
export async function completeFeaturedPayment(featuredId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    await prisma.featuredListing.update({
        where: { id: featuredId },
        data: { status: 'ACTIVE' } // Mocking payment success
    });

    revalidatePath('/dashboard/listings');
}
