'use client';

import { ReferralDashboard } from '@/components/referral-dashboard';

export default function ReferralsStandalonePage() {
  return (
    <div className="mx-auto max-w-5xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Referral Program</h1>
        <p className="text-slate-500">Share Propad and earn rewards for every successful invite.</p>
      </div>

      <ReferralDashboard />
    </div>
  );
}
