'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { PropertyStatus, InterestStatus } from '@prisma/client';

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
    await prisma.$transaction([
      prisma.interest.update({
        where: { id: interestId },
        data: { status: InterestStatus.ACCEPTED }
      }),
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
