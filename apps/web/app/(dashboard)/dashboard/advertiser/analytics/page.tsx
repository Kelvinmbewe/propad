'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@propad/ui';

export default function AdvertiserAnalyticsPage() {
    const sdk = useAuthenticatedSDK();
    const { data, isLoading, isError } = useQuery({
        queryKey: ['advertiser-analytics-summary'],
        enabled: !!sdk,
        queryFn: async () => sdk!.ads.getAnalyticsSummary()
    });

    const summary = data || {};

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-[color:var(--aurora-color-text)]">Analytics</h1>
                <p className="text-sm text-[color:var(--aurora-color-text-muted)]">Campaign performance and spend.</p>
            </div>

            {isLoading && <Skeleton className="h-24 w-full" />}
            {isError && <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">Failed to load analytics.</div>}

            {!isLoading && !isError && (
                summary && Object.keys(summary).length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <StatCard label="Impressions (30d)" value={summary.impressions30d ?? 0} />
                        <StatCard label="Clicks (30d)" value={summary.clicks30d ?? 0} />
                        <StatCard label="Spend (30d)" value={`$${formatCents(summary.spend30dCents ?? 0)}`} />
                        <StatCard label="CTR" value={`${safePercent(summary.impressions30d, summary.clicks30d)}%`} />
                    </div>
                ) : (
                    <EmptyState />
                )
            )}
        </div>
    );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
    return (
        <Card className="bg-[color:var(--aurora-color-elevated)]/80 border-[color:var(--aurora-color-border)]">
            <CardHeader>
                <CardTitle className="text-sm text-[color:var(--aurora-color-text-muted)]">{label}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-semibold text-[color:var(--aurora-color-text)]">{value}</div>
            </CardContent>
        </Card>
    );
}

function EmptyState() {
    return (
        <Card className="border-dashed border-[color:var(--aurora-color-border)] bg-[color:var(--aurora-color-elevated)]/60">
            <CardContent className="py-10 text-center text-[color:var(--aurora-color-text-muted)]">
                No performance data yet — run campaigns to see analytics.
            </CardContent>
        </Card>
    );
}

function safePercent(impressions?: number, clicks?: number) {
    if (!impressions || impressions === 0) return 0;
    return ((clicks ?? 0) / impressions * 100).toFixed(2);
}

function formatCents(cents: number) {
    return (cents / 100).toFixed(2);
}
