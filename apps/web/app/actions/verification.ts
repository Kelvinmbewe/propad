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

        // 2. Fallback: Lazy Migration of Legacy "Verification"
        // If we find a legacy record, we UPGRADE it to a Request instantly.
        const legacy = await prisma.verification.findFirst({
            where: {
                targetId: propertyId,
                targetType: 'property'
            },
            orderBy: { createdAt: 'desc' }
        });

        if (legacy) {
            console.log(`[LAZY MIGRATION] Migrating Verification ${legacy.id} to VerificationRequest`);

            // Create Canonical Request
            const newRequest = await prisma.verificationRequest.create({
                data: {
                    targetType: 'PROPERTY',
                    targetId: propertyId,
                    propertyId: propertyId,
                    requesterId: legacy.requesterId,
                    // Map legacy status to new status strictly
                    status: legacy.status === 'APPROVED' ? 'APPROVED' : 'SUBMITTED',
                    items: {
                        create: {
                            type: VerificationItemType.OWNERSHIP_PROOF, // Default type for legacy migration
                            status: legacy.status === 'APPROVED' ? 'APPROVED' : 'SUBMITTED',
                            notes: 'Migrated from legacy system',
                            documents: legacy.evidenceUrl ? [legacy.evidenceUrl] : [],
                        }
                    }
                },
                include: {
                    items: true
                }
            });

            return newRequest;
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
        // Check for existing active request
        const existing = await prisma.verificationRequest.findFirst({
            where: {
                propertyId: propertyId,
                status: {
                    in: ['PENDING', 'SUBMITTED', 'PENDING_REVIEW', 'PAID']
                }
            },
            include: { items: true }
        });

        if (existing) {
            // Ensure we have an item of this type? For now, just return existing request to prevent duplicates.
            return existing;
        }

        // Create New Request (Canonical)
        // Note: We intentionally use 'SUBMITTED' or 'PENDING' to ensure it hits the Admin Queue logic
        const request = await prisma.verificationRequest.create({
            data: {
                targetType: 'PROPERTY',
                targetId: propertyId,
                propertyId: propertyId,
                requesterId: session.user.id,
                status: 'SUBMITTED', // Starts as Submitted
                items: {
                    create: {
                        type: type as VerificationItemType,
                        status: 'SUBMITTED',
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
