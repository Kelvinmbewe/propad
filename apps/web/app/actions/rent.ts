'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function logRentPayment(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const propertyId = formData.get('propertyId') as string;
  const amountStr = formData.get('amount') as string;
  const currency = formData.get('currency') as 'USD' | 'ZWG';
  const paidAtStr = formData.get('paidAt') as string;
  const proofUrl = formData.get('proofUrl') as string; // Assuming file upload handled elsewhere or URL provided

  const amount = parseFloat(amountStr);
  const paidAt = new Date(paidAtStr);

  try {
    await prisma.rentPayment.create({
      data: {
        tenantId: session.user.id,
        propertyId,
        amount,
        currency,
        paidAt,
        proofUrl,
        isVerified: false // Needs landlord verification
      }
    });

    revalidatePath('/dashboard/rent-history');
    return { success: true };
  } catch (error) {
    console.error('Failed to log payment:', error);
    return { error: 'Failed to log payment' };
  }
}
