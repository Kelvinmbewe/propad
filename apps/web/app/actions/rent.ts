'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { serverApiRequest } from '@/lib/server-api';

export async function logRentPayment(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const propertyId = formData.get('propertyId') as string;
  const amountStr = formData.get('amount') as string;
  const currency = formData.get('currency') as 'USD' | 'ZWG';
  const paidAtStr = formData.get('paidAt') as string;
  const proofUrl = formData.get('proofUrl') as string;

  const amount = parseFloat(amountStr);
  const paidAt = new Date(paidAtStr);

  try {
    await serverApiRequest(`/properties/${propertyId}/rent-payments`, {
      method: 'POST',
      body: {
        amount,
        currency,
        paidAt,
        ...(proofUrl ? { proofUrl } : {})
      }
    });

    revalidatePath('/dashboard/rent-history');
    return { success: true };
  } catch (error) {
    console.error('Failed to log payment:', error);
    return { error: 'Failed to log payment' };
  }
}
