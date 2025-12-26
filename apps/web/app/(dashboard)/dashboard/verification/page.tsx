'use client';

import { useSession } from 'next-auth/react';
import { CheckCircle, ShieldCheck } from 'lucide-react';
import { PaymentGate } from '@/components/payment-gate';
import { useQuery } from '@tanstack/react-query';

export default function VerificationPage() {
  const { data: session } = useSession();

  const { data: user } = useQuery({
    queryKey: ['user-me'],
    queryFn: async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/users/me`, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to load user');
      }
      return response.json();
    },
    enabled: !!session?.accessToken
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

      <PaymentGate
        featureType="TRUST_BOOST"
        targetId={user?.id || ''}
        featureName="User Verification"
        featureDescription="Get verified to build trust with landlords and tenants"
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-8">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Standard Verification</h3>
              <p className="mt-1 text-slate-500">Fast-track your verification process.</p>
            </div>
          </div>
          <div className="mt-8">
            <p className="text-sm text-slate-500">Verification access granted. Please proceed with the verification process.</p>
          </div>
        </div>
      </PaymentGate>
    </div>
  );
}
