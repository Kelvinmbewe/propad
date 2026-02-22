'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { serverApiRequest } from '@/lib/server-api';

// Local status constants matching API schema
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

    await serverApiRequest(`/interests/${interestId}/status`, {
      method: 'PATCH',
      body: { status: InterestStatus.ACCEPTED }
    });

    revalidatePath('/dashboard/interests');
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

    await serverApiRequest(`/interests/${interestId}/status`, {
      method: 'PATCH',
      body: { status: InterestStatus.REJECTED }
    });

    revalidatePath('/dashboard/interests');
    return { success: true };
  } catch (error) {
    console.error('Error rejecting interest:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to reject interest';
    return { error: errorMessage };
  }
}
