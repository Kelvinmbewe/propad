'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
// Local status constants matching Prisma schema
const PropertyStatus = {
  DRAFT: 'DRAFT',
  PENDING_VERIFY: 'PENDING_VERIFY',
  VERIFIED: 'VERIFIED',
  UNDER_OFFER: 'UNDER_OFFER',
  RENTED: 'RENTED',
  SOLD: 'SOLD',
  ARCHIVED: 'ARCHIVED',
  OCCUPIED: 'OCCUPIED',
} as const;

const InterestStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  ON_HOLD: 'ON_HOLD',
} as const;

export async function acceptInterest(interestId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    // Verify ownership
    const interest = await prisma.interest.findUnique({
      where: { id: interestId },
      include: {
        property: {
          select: {
            id: true,
            landlordId: true,
            agentOwnerId: true
          }
        }
      }
    });

    if (!interest) {
      return { error: 'Interest not found' };
    }

    if (interest.property.landlordId !== session.user.id && interest.property.agentOwnerId !== session.user.id) {
      return { error: 'Unauthorized' };
    }

    // Update interest status and property status
    // Enforce one ACCEPTED offer per listing - set all other offers to ON_HOLD
    await prisma.$transaction([
      // Set all other offers on this property to ON_HOLD
      prisma.interest.updateMany({
        where: {
          propertyId: interest.propertyId,
          id: { not: interestId },
          status: { in: [InterestStatus.PENDING, InterestStatus.ACCEPTED] }
        },
        data: { status: InterestStatus.ON_HOLD }
      }),
      // Accept the selected offer
      prisma.interest.update({
        where: { id: interestId },
        data: { status: InterestStatus.ACCEPTED }
      }),
      // Update property status
      prisma.property.update({
        where: { id: interest.propertyId },
        data: { status: PropertyStatus.UNDER_OFFER }
      })
    ]);

    revalidatePath('/dashboard/interests');
    revalidatePath(`/dashboard/listings/${interest.propertyId}`);
    return { success: true };
  } catch (error) {
    console.error('Error accepting interest:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to accept interest';
    return { error: errorMessage };
  }
}

export async function rejectInterest(interestId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    const interest = await prisma.interest.findUnique({
      where: { id: interestId },
      include: {
        property: {
          select: {
            id: true,
            landlordId: true,
            agentOwnerId: true
          }
        }
      }
    });

    if (!interest) {
      return { error: 'Interest not found' };
    }

    if (interest.property.landlordId !== session.user.id && interest.property.agentOwnerId !== session.user.id) {
      return { error: 'Unauthorized' };
    }

    await prisma.interest.update({
      where: { id: interestId },
      data: { status: InterestStatus.REJECTED }
    });

    revalidatePath('/dashboard/interests');
    revalidatePath(`/dashboard/listings/${interest.propertyId}`);
    return { success: true };
  } catch (error) {
    console.error('Error rejecting interest:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to reject interest';
    return { error: errorMessage };
  }
}
