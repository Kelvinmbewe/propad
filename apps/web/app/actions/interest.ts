'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function submitInterest(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'You must be logged in to express interest.' };
  }

  const propertyId = formData.get('propertyId') as string;
  const message = formData.get('message') as string;
  const offerAmountStr = formData.get('offerAmount') as string;

  if (!propertyId) {
    return { error: 'Property ID is required.' };
  }

  const offerAmount = offerAmountStr ? parseFloat(offerAmountStr) : undefined;

  try {
    await prisma.interest.create({
      data: {
        propertyId,
        userId: session.user.id,
        message,
        offerAmount,
        status: 'PENDING'
      }
    });

    revalidatePath(`/properties/${propertyId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to submit interest:', error);
    return { error: 'Failed to submit interest. You may have already expressed interest in this property.' };
  }
}
