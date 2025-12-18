'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function getPropertyVerification(propertyId: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');

        return await prisma.verification.findFirst({
            where: {
                targetId: propertyId,
                targetType: 'property'
            },
            orderBy: { createdAt: 'desc' }
        });
    } catch (error) {
        console.error('getPropertyVerification error:', error);
        return null; // Return null instead of throwing to prevent 500
    }
}

export async function requestPropertyVerification(propertyId: string, type: 'OWNERSHIP_PROOF' | 'LOCATION_CHECK' | 'MEDIA_VALIDATION' = 'OWNERSHIP_PROOF') {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    try {
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
                status: 'PENDING',
                targetType: 'property',
                targetId: propertyId,
                requesterId: session.user.id,
                propertyId,
                method: 'DOCS',
            }
        });

        revalidatePath(`/dashboard/listings/${propertyId}`);
        return verification;
    } catch (error) {
        console.error('requestPropertyVerification error:', error);
        throw new Error('Unable to request verification at this time');
    }
}
