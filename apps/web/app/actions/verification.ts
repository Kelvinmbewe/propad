'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function getPropertyVerification(propertyId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    return prisma.verification.findFirst({
        where: {
            targetId: propertyId,
            targetType: 'property'
        },
        orderBy: { createdAt: 'desc' }
    });
}

export async function requestPropertyVerification(propertyId: string, type: 'OWNERSHIP_PROOF' | 'LOCATION_CHECK' | 'MEDIA_VALIDATION' = 'OWNERSHIP_PROOF') {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    // Check if pending verification exists
    const existing = await prisma.verification.findFirst({
        where: {
            targetId: propertyId,
            targetType: 'property',
            status: 'PENDING'
        }
    });

    if (existing) return existing;

    const verification = await prisma.verification.create({
        data: {
            type,
            status: 'PENDING',
            targetType: 'property',
            targetId: propertyId,
            userId: session.user.id,
            // Mock data for required fields if any
            provider: 'MANUAL',
            method: 'DOCUMENT',
        }
    });

    revalidatePath(`/dashboard/listings/${propertyId}`);
    return verification;
}
