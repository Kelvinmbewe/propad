'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@propad/ui';
import { useRouter } from 'next/navigation';
import { useSdk } from '../../../../hooks/use-sdk';
import type { AdvertiserAnalyticsSummary } from '@propad/sdk';

const TrendIndicator = ({ value }: { value: number }) => {
    if (value === 0) return null;
    const isPositive = value > 0;
    return (
        <span className={`inline-flex items-center text-xs font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? '↑' : '↓'} {Math.abs(value).toFixed(1)}%
        </span>
    );
};

export default function AdvertiserOverview() {
    const router = useRouter();
    const { sdk } = useSdk();
    const [analytics, setAnalytics] = useState<AdvertiserAnalyticsSummary | null>(null);
    const [balance, setBalance] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const [analyticsResponse, balanceResponse] = await Promise.all([
                    sdk.ads.getAnalyticsSummary(),
                    sdk.ads.getBalance(),
                ]);
                setAnalytics(analyticsResponse);
                setBalance(balanceResponse.balanceCents);
            } catch (error) {
                console.error('Failed to load advertiser data:', error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [sdk]);

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(cents / 100);
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('en-US').format(num);
    };

    const summary = analytics?.summary;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-white">Advertiser Dashboard</h1>
                <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => router.push('/dashboard/advertiser/campaigns')}
                >
                    View Campaigns
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-5">
                <Card className="bg-white/5 border-white/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">Impressions (30d)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="h-8 bg-white/10 animate-pulse rounded" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold text-white">
                                    {formatNumber(summary?.current.impressions ?? 0)}
                                </div>
                                <div className="flex items-center space-x-2">
                                    <p className="text-xs text-gray-500">vs prev 30d</p>
                                    <TrendIndicator value={summary?.trends.impressions ?? 0} />
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">Clicks (30d)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="h-8 bg-white/10 animate-pulse rounded" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold text-white">
                                    {formatNumber(summary?.current.clicks ?? 0)}
                                </div>
                                <div className="flex items-center space-x-2">
                                    <p className="text-xs text-gray-500">CTR: {(summary?.current.ctr || 0 * 100).toFixed(2)}%</p>
                                    <TrendIndicator value={summary?.trends.clicks ?? 0} />
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">Spend (30d)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="h-8 bg-white/10 animate-pulse rounded" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold text-white">
                                    {formatCurrency(summary?.current.spendCents ?? 0)}
                                </div>
                                <div className="flex items-center space-x-2">
                                    <p className="text-xs text-gray-500">vs prev 30d</p>
                                    <TrendIndicator value={summary?.trends.spendCents ?? 0} />
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">Wallet Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="h-8 bg-white/10 animate-pulse rounded" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold text-white">
                                    {formatCurrency(balance ?? 0)}
                                </div>
                                <p className="text-xs text-blue-400">
                                    <a href="/dashboard/wallet" className="hover:underline">
                                        Top Up →
                                    </a>
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-emerald-900/10 border-emerald-500/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-400">Protected Spend</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="h-8 bg-white/10 animate-pulse rounded" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold text-white">
                                    {formatCurrency((analytics?.summary as any)?.fraud?.protectedSpendCents ?? 0)}
                                </div>
                                <div className="flex items-center space-x-2">
                                    <p className="text-xs text-emerald-500">
                                        {(analytics?.summary as any)?.fraud?.blockedCount ?? 0} fraud attempts blocked
                                    </p>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-white">Campaign Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="h-24 bg-white/10 animate-pulse rounded" />
                        ) : (
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <p className="text-2xl font-bold text-green-400">{analytics?.campaigns.active ?? 0}</p>
                                    <p className="text-xs text-gray-400 uppercase tracking-wider">Active</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-yellow-400">{analytics?.campaigns.paused ?? 0}</p>
                                    <p className="text-xs text-gray-400 uppercase tracking-wider">Paused</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-400">{analytics?.campaigns.ended ?? 0}</p>
                                    <p className="text-xs text-gray-400 uppercase tracking-wider">Ended</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-white">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Button
                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => router.push('/dashboard/advertiser/campaigns?create=true')}
                        >
                            + Create New Campaign
                        </Button>
                        <Button
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            variant="outline"
                            onClick={() => router.push('/dashboard/wallet')}
                        >
                            Top Up Balance
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
