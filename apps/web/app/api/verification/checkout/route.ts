import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { serverApiRequest } from '@/lib/server-api';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const formData = await req.formData();
  const gateway = formData.get('gateway') as string;

  try {
    // TODO: Implement API endpoint for verification checkout
    // await serverApiRequest('/verification/checkout', {
    //     method: 'POST',
    //     body: { gateway }
    // });
    console.warn('[verification/checkout/route.ts] - API endpoint not yet implemented');

    // Mock success for now
    return redirect('/dashboard/verification');
  } catch (error) {
    console.error('Verification checkout error:', error);
    return new Response('Failed to process checkout', { status: 500 });
  }
}
