import { Metadata } from 'next';
import { Suspense } from 'react';
import { PropertyManagement } from '@/components/property-management';

export const metadata: Metadata = {
  title: 'Manage listings | PropAd'
};

export default function ListingsDashboardPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-500">Loading your listings…</p>}>
      <PropertyManagement />
    </Suspense>
  );
}
