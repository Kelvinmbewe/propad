'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function submitReview(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const revieweeId = formData.get('revieweeId') as string;
  const ratingStr = formData.get('rating') as string;
  const comment = formData.get('comment') as string;
  const type = formData.get('type') as string; // ReviewerType

  const rating = parseInt(ratingStr, 10);

  // Calculate weight based on reviewer type
  let weight = 1;
  if (type === 'PREVIOUS_TENANT') weight = 10;
  else if (type === 'NEIGHBOR') weight = 5;
  else if (type === 'ANONYMOUS') weight = 0; // Very low or zero

  try {
    await prisma.userReview.create({
      data: {
        reviewerId: session.user.id,
        revieweeId,
        rating,
        comment,
        type: type as any,
        weight
      }
    });

    // Update User's aggregated rating (if we were storing it on the user model, currently we compute it on read)
    // But for performance, updating AgentProfile.rating might be good if they are an agent.
    // For now, we just store the review.

    revalidatePath(`/users/${revieweeId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to submit review:', error);
    return { error: 'Failed to submit review' };
  }
}
