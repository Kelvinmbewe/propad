'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@propad/ui';
import { useSdk } from '../../../../../../hooks/use-sdk';
import type { CampaignAnalytics } from '@propad/sdk';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
} from 'recharts';

export default function CampaignAnalyticsPage() {
    const params = useParams();
    const router = useRouter();
    const { sdk } = useSdk();
    const [data, setData] = useState<CampaignAnalytics | null>(null);
    const [loading, setLoading] = useState(true);

    const id = params.id as string;

    useEffect(() => {
        async function loadData() {
            try {
                const response = await sdk.ads.getCampaignAnalytics(id);
                setData(response);
            } catch (error) {
                console.error('Failed to load campaign analytics:', error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [id, sdk]);

    if (loading) {
        return (
            <div className="p-8 space-y-6">
                <div className="h-10 w-64 bg-white/10 animate-pulse rounded" />
                <div className="grid gap-4 md:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i} className="bg-white/5 border-white/10 h-24 animate-pulse" />
                    ))}
                </div>
                <Card className="bg-white/5 border-white/10 h-[400px] animate-pulse" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="p-8 text-center text-white space-y-4">
                <p className="text-xl font-semibold">Campaign not found</p>
                <Button onClick={() => router.push('/dashboard/advertiser/campaigns')}>
                    Back to Campaigns
                </Button>
            </div>
        );
    }

    const { campaign, analytics, timeSeries } = data;

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(cents / 100);
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('en-US').format(num);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center space-x-3">
                        <h1 className="text-3xl font-bold tracking-tight text-white">{campaign.name}</h1>
                        <Badge variant={campaign.status === 'ACTIVE' ? 'default' : 'secondary'}>
                            {campaign.status}
                        </Badge>
                    </div>
                    <p className="text-gray-400">Campaign Analytics • {campaign.type}</p>
                </div>
                <div className="flex space-x-2">
                    <Button variant="outline" className="text-white border-white/20 hover:bg-white/10" onClick={() => router.push('/dashboard/advertiser/campaigns')}>
                        Campaigns
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => router.push(`/dashboard/advertiser/campaigns?edit=${id}`)}>
                        Edit Campaign
                    </Button>
                </div>
            </div>

            {/* Top Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-white/5 border-white/10 text-white">
                    <CardHeader className="pb-2 text-gray-400">
                        <CardTitle className="text-sm font-medium">Impressions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatNumber(analytics.impressions)}</div>
                        <p className="text-xs text-gray-500 mt-1">Total views</p>
                    </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10 text-white">
                    <CardHeader className="pb-2 text-gray-400">
                        <CardTitle className="text-sm font-medium">Clicks</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatNumber(analytics.clicks)}</div>
                        <p className="text-xs text-blue-400 mt-1">CTR: {(analytics.ctr * 100).toFixed(2)}%</p>
                    </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10 text-white">
                    <CardHeader className="pb-2 text-gray-400">
                        <CardTitle className="text-sm font-medium">Spend</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(analytics.totalSpendCents)}</div>
                        <p className="text-xs text-green-400 mt-1">Lifetime budget used</p>
                    </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10 text-white">
                    <CardHeader className="pb-2 text-gray-400">
                        <CardTitle className="text-sm font-medium">Budget</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {analytics.budgetCents ? formatCurrency(analytics.budgetCents) : 'Unlimited'}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            {analytics.remainingBudget !== null ? `${formatCurrency(analytics.remainingBudget)} left` : 'No limit set'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-white text-lg">Performance Over Time</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[350px] pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={timeSeries}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="date" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis yAxisId="left" stroke="#3b82f6" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={11} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                                    itemStyle={{ fontSize: '12px' }}
                                />
                                <Line yAxisId="left" name="Impressions" type="monotone" dataKey="impressions" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 0, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                                <Line yAxisId="right" name="Clicks" type="monotone" dataKey="clicks" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 0, fill: '#10b981' }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-white text-lg">Spending Trends ($)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[350px] pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={timeSeries}>
                                <defs>
                                    <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="date" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#666" fontSize={11} tickLine={false} axisLine={false} />
                                <Tooltip
                                    formatter={(val: number) => [`$${(val / 100).toFixed(2)}`, 'Spend']}
                                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                                />
                                <Area type="monotone" dataKey="spendCents" stroke="#ef4444" fillOpacity={1} fill="url(#colorSpend)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Data Table */}
            <Card className="bg-white/5 border-white/10">
                <CardHeader>
                    <CardTitle className="text-white">Daily Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-3 font-semibold">Date</th>
                                    <th className="px-6 py-3 font-semibold">Impressions</th>
                                    <th className="px-6 py-3 font-semibold">Clicks</th>
                                    <th className="px-6 py-3 font-semibold">CTR</th>
                                    <th className="px-6 py-3 font-semibold text-right">Spend</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {[...timeSeries].reverse().map((day) => (
                                    <tr key={day.date} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4 text-white font-medium">{day.date}</td>
                                        <td className="px-6 py-4 text-gray-300">{formatNumber(day.impressions)}</td>
                                        <td className="px-6 py-4 text-gray-300">{formatNumber(day.clicks)}</td>
                                        <td className="px-6 py-4">
                                            <span className="text-blue-400">
                                                {day.impressions > 0 ? ((day.clicks / day.impressions) * 100).toFixed(2) : '0.00'}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-white text-right font-medium">{formatCurrency(day.spendCents)}</td>
                                    </tr>
                                ))}
                                {timeSeries.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-10 text-center text-gray-500 italic">
                                            No data available for this period.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
