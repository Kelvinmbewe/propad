import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const formData = await req.formData();
  const gateway = formData.get('gateway') as string;

  // 1. Create Invoice
  const invoice = await prisma.invoice.create({
    data: {
      buyerUserId: session.user.id,
      purpose: 'VERIFICATION',
      currency: 'USD',
      amountCents: 2000, // $20.00
      taxCents: 0,
      amountUsdCents: 2000,
      taxUsdCents: 0,
      status: 'OPEN'
    }
  });

  // 2. Create Payment Intent (mock)
  await prisma.paymentIntent.create({
    data: {
      invoiceId: invoice.id,
      gateway: gateway as any,
      reference: `REF-${Date.now()}`,
      amountCents: 2000,
      currency: 'USD',
      status: 'PROCESSING'
    }
  });

  // 3. Mock Success - In real world, redirect to gateway URL
  // Here we immediately verify the user for demo purposes
  await prisma.user.update({
    where: { id: session.user.id },
    data: { isVerified: true }
  });

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { status: 'PAID' }
  });

  return redirect('/dashboard/verification');
}
