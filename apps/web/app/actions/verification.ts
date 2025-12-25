'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { VerificationStatus, VerificationType, VerificationItemStatus, VerificationItemType } from '@prisma/client';

export async function getPropertyVerification(propertyId: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');

        // 1. Primary: Check Canonical Source (VerificationRequest)
        const request = await prisma.verificationRequest.findFirst({
            where: {
                propertyId: propertyId,
                targetType: 'PROPERTY'
            },
            include: {
                items: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        if (request) {
            return request;
        }

        return null; // No verification found
    } catch (error) {
        console.error('getPropertyVerification error:', error);
        return null; // Return null instead of throwing to prevent 500
    }
}

export async function requestPropertyVerification(propertyId: string, type: 'OWNERSHIP_PROOF' | 'LOCATION_CHECK' | 'MEDIA_VALIDATION' = 'OWNERSHIP_PROOF') {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    try {
        // Enforce Canonical Model: VerificationRequest
        // Map legacy frontend types to Schema Enum
        let schemaType: VerificationItemType = VerificationItemType.PROOF_OF_OWNERSHIP;
        if (type === 'LOCATION_CHECK') schemaType = VerificationItemType.LOCATION_CONFIRMATION;
        if (type === 'MEDIA_VALIDATION') schemaType = VerificationItemType.PROPERTY_PHOTOS;

        // Check for existing active request
        const existing = await prisma.verificationRequest.findFirst({
            where: {
                propertyId: propertyId,
                status: {
                    // Filter only valid VerificationStatus Enum values that imply "Active"
                    in: [VerificationStatus.PENDING]
                }
            },
            include: { items: true }
        });

        if (existing) {
            // Ensure we have an item of this type? For now, just return existing request to prevent duplicates.
            return existing;
        }

        // Create New Request (Canonical)
        // Request Status: PENDING (Active)
        // Item Status: SUBMITTED (To appear in queue)
        const request = await prisma.verificationRequest.create({
            data: {
                targetType: 'PROPERTY',
                targetId: propertyId,
                propertyId: propertyId,
                requesterId: session.user.id,
                status: VerificationStatus.PENDING,
                items: {
                    create: {
                        type: schemaType,
                        status: VerificationItemStatus.SUBMITTED,
                        notes: 'User requested verification'
                    }
                }
            },
            include: {
                items: true
            }
        });

        revalidatePath(`/dashboard/listings/${propertyId}`);
        return request;
    } catch (error) {
        console.error('requestPropertyVerification error:', error);
        throw new Error('Unable to request verification at this time');
    }
}
