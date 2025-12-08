import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { CheckCircle, ShieldCheck } from 'lucide-react';

export default async function VerificationPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id }
  });

  if (user?.isVerified) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle className="h-16 w-16 text-emerald-500" />
        <h1 className="mt-4 text-2xl font-bold text-slate-900">You are Verified!</h1>
        <p className="mt-2 text-slate-600">Your account has the verification badge.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8">
      <div className="text-center">
        <ShieldCheck className="mx-auto h-12 w-12 text-emerald-600" />
        <h1 className="mt-4 text-3xl font-bold text-slate-900">Get Verified</h1>
        <p className="mt-2 text-lg text-slate-600">
          Build trust with landlords and tenants by verifying your identity.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-8">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Standard Verification</h3>
            <p className="mt-1 text-slate-500">Fast-track your verification process.</p>
          </div>
          <div className="text-2xl font-bold text-slate-900">$20</div>
        </div>

        <div className="mt-8 space-y-4">
          <p className="text-sm text-slate-600">Select Payment Method:</p>
          <div className="grid gap-4 sm:grid-cols-3">
             {/* Mock buttons for payment gateways */}
             <form action="/api/verification/checkout" method="POST">
                <input type="hidden" name="gateway" value="PAYNOW" />
                <button className="flex w-full flex-col items-center justify-center rounded-lg border border-slate-200 p-4 hover:border-emerald-500 hover:bg-emerald-50">
                  <span className="font-semibold">Paynow</span>
                </button>
             </form>
             <form action="/api/verification/checkout" method="POST">
                <input type="hidden" name="gateway" value="STRIPE" />
                <button className="flex w-full flex-col items-center justify-center rounded-lg border border-slate-200 p-4 hover:border-emerald-500 hover:bg-emerald-50">
                  <span className="font-semibold">Stripe</span>
                </button>
             </form>
             <form action="/api/verification/checkout" method="POST">
                <input type="hidden" name="gateway" value="PAYPAL" />
                <button className="flex w-full flex-col items-center justify-center rounded-lg border border-slate-200 p-4 hover:border-emerald-500 hover:bg-emerald-50">
                  <span className="font-semibold">PayPal</span>
                </button>
             </form>
          </div>
        </div>
      </div>
    </div>
  );
}
