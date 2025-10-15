'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@propad/ui';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';

export function DashboardOverview() {
  const sdk = useAuthenticatedSDK();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard:stats'],
    queryFn: () => sdk!.metrics.dashboard(),
    enabled: !!sdk
  });

  if (!sdk) {
    return <p className="text-sm text-neutral-500">Preparing your dashboard…</p>;
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, idx) => (
          <Skeleton key={idx} className="h-28" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return <p className="text-sm text-red-600">Unable to load dashboard metrics.</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <StatCard title="Active listings" value={data.activeListings} />
      <StatCard title="Pending verifications" value={data.pendingVerifications} />
      <StatCard title="Reward pool (USD)" value={`$${data.rewardPoolUsd}`} />
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-3xl font-semibold">{value}</CardContent>
    </Card>
  );
}
