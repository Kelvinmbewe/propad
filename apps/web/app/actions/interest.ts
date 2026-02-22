'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { serverApiRequest } from '@/lib/server-api';

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
    await serverApiRequest(`/properties/${propertyId}/interest`, {
      method: 'POST',
      body: { message, offerAmount }
    });

    revalidatePath(`/properties/${propertyId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to submit interest:', error);
    return { error: 'Failed to submit interest. You may have already expressed interest in this property.' };
  }
}
