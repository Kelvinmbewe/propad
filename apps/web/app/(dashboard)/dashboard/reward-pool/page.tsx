'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@propad/ui';

export default function RewardPoolPage() {
    const sdk = useAuthenticatedSDK();
    const { data, isLoading, isError } = useQuery({
        queryKey: ['reward-pools'],
        enabled: !!sdk,
        queryFn: async () => sdk!.rewards.pools()
    });

    const pools = data ?? [];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Reward Pool</h1>
                <p className="text-sm text-neutral-500">Manage agent commissions and reward distributions.</p>
            </div>

            {isLoading && <Skeleton className="h-24 w-full" />}
            {isError && <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">Failed to load reward pools.</div>}

            {!isLoading && !isError && (
                <div className="grid gap-4 md:grid-cols-3">
                    <StatCard label="Total Pool Balance" value={`$${formatCents(pools.reduce((s: number, p: any) => s + (p.totalUsdCents ?? 0), 0))}`} />
                    <StatCard label="Spent" value={`$${formatCents(pools.reduce((s: number, p: any) => s + (p.spentUsdCents ?? 0), 0))}`} />
                    <StatCard label="Active Pools" value={pools.length} />
                </div>
            )}

            {!isLoading && !isError && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Active Pools</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {pools.length === 0 ? (
                            <div className="text-sm text-neutral-500">No reward pools yet.</div>
                        ) : (
                            pools.map((pool: any) => (
                                <div key={pool.id} className="rounded border border-neutral-200 p-3">
                                    <div className="font-semibold">{pool.name || 'Reward Pool'}</div>
                                    <div className="text-sm text-neutral-600">Total: ${formatCents(pool.totalUsdCents ?? 0)}</div>
                                    <div className="text-sm text-neutral-600">Spent: ${formatCents(pool.spentUsdCents ?? 0)}</div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <p className="text-sm font-medium text-neutral-500">{label}</p>
            <p className="mt-2 text-3xl font-bold">{value}</p>
        </div>
    );
}

function formatCents(cents: number) {
    return (cents / 100).toFixed(2);
}
