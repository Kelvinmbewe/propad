'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { serverApiRequest } from '@/lib/server-api';

export async function submitReview(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const revieweeId = formData.get('revieweeId') as string;
  const ratingStr = formData.get('rating') as string;
  const comment = formData.get('comment') as string;
  const type = formData.get('type') as string;

  const rating = parseInt(ratingStr, 10);

  // Calculate weight based on reviewer type
  let weight = 1;
  if (type === 'PREVIOUS_TENANT') weight = 10;
  else if (type === 'NEIGHBOR') weight = 5;
  else if (type === 'ANONYMOUS') weight = 0;

  try {
    // TODO: Implement API endpoint
    // await serverApiRequest('/reviews', {
    //     method: 'POST',
    //     body: { revieweeId, rating, comment, type, weight }
    // });
    console.warn('[reviews.ts] submitReview - API endpoint not yet implemented');

    revalidatePath(`/users/${revieweeId}`);
    return { success: true, warning: 'API endpoint pending implementation' };
  } catch (error) {
    console.error('Failed to submit review:', error);
    return { error: 'Failed to submit review' };
  }
}
