'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@propad/ui';
import { useRouter } from 'next/navigation';
import { useSdk } from '../../../../hooks/use-sdk';

interface AdvertiserStats {
    impressions: number;
    clicks: number;
    spend: number;
    campaigns: number;
}

export default function AdvertiserOverview() {
    const router = useRouter();
    const { sdk } = useSdk();
    const [stats, setStats] = useState<AdvertiserStats | null>(null);
    const [balance, setBalance] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                // Load stats and balance in parallel
                const [statsResponse, balanceResponse] = await Promise.all([
                    sdk.advertisers.getStats(),
                    sdk.ads.getBalance(),
                ]);
                setStats(statsResponse);
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

    const ctr = stats && stats.impressions > 0
        ? ((stats.clicks / stats.impressions) * 100).toFixed(2)
        : '0.00';

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

            <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-gray-400">Total Impressions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="h-8 bg-white/10 animate-pulse rounded" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold text-white">
                                    {formatNumber(stats?.impressions ?? 0)}
                                </div>
                                <p className="text-xs text-gray-400">Lifetime</p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-gray-400">Total Clicks</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="h-8 bg-white/10 animate-pulse rounded" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold text-white">
                                    {formatNumber(stats?.clicks ?? 0)}
                                </div>
                                <p className="text-xs text-gray-400">CTR: {ctr}%</p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-gray-400">Active Campaigns</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="h-8 bg-white/10 animate-pulse rounded" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold text-white">
                                    {stats?.campaigns ?? 0}
                                </div>
                                <p className="text-xs text-blue-400">
                                    <a href="/dashboard/advertiser/campaigns" className="hover:underline">
                                        Manage →
                                    </a>
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
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
                                <p className="text-xs text-green-400">Available for campaigns</p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-white">Total Spend</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="h-16 bg-white/10 animate-pulse rounded" />
                        ) : (
                            <div className="space-y-2">
                                <div className="text-3xl font-bold text-white">
                                    {formatCurrency((stats?.spend ?? 0) * 100)}
                                </div>
                                <p className="text-sm text-gray-400">
                                    Across all campaigns
                                </p>
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
