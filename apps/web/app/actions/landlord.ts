'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function acceptInterest(interestId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  // Verify ownership
  const interest = await prisma.interest.findUnique({
    where: { id: interestId },
    include: { property: true }
  });

  if (!interest) {
    throw new Error('Interest not found');
  }

  if (interest.property.landlordId !== session.user.id && interest.property.agentOwnerId !== session.user.id) {
    throw new Error('Unauthorized');
  }

  // Update interest status and property status
  await prisma.$transaction([
    prisma.interest.update({
      where: { id: interestId },
      data: { status: 'ACCEPTED' }
    }),
    prisma.property.update({
      where: { id: interest.propertyId },
      data: { status: 'UNDER_OFFER' }
    })
  ]);

  revalidatePath('/dashboard/interests');
  return { success: true };
}
