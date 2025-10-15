import { Metadata } from 'next';
import { Suspense } from 'react';
import { DashboardOverview } from '@/components/dashboard-overview';

export const metadata: Metadata = {
  title: 'Dashboard | PropAd'
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<p>Loading dashboard…</p>}>
      <DashboardOverview />
    </Suspense>
  );
}
