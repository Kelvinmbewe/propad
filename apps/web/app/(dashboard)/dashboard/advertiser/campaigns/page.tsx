'use client';
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, Button, Dialog, DialogContent, DialogHeader, DialogTitle } from '@propad/ui';

import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';
import type { Campaign } from '@propad/sdk/ads';

export default function AdvertiserCampaigns() {
    const sdk = useAuthenticatedSDK();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        if (sdk) {
            loadCampaigns();
        }
    }, [sdk]);

    async function loadCampaigns() {
        if (!sdk) return;
        try {
            const data = await sdk.ads.getMyCampaigns();
            setCampaigns(data);
        } catch (error) {
            console.error('Failed to load campaigns:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handlePause(campaignId: string) {
        if (!sdk) return;
        setActionLoading(campaignId);
        try {
            await sdk.ads.pauseCampaign(campaignId);
            await loadCampaigns();
        } catch (error) {
            console.error('Failed to pause campaign:', error);
        } finally {
            setActionLoading(null);
        }
    }

    async function handleResume(campaignId: string) {
        if (!sdk) return;
        setActionLoading(campaignId);
        try {
            await sdk.ads.resumeCampaign(campaignId);
            await loadCampaigns();
        } catch (error) {
            console.error('Failed to resume campaign:', error);
        } finally {
            setActionLoading(null);
        }
    }

    async function handleDelete(campaignId: string) {
        if (!sdk) return;
        const confirmed = window.confirm('End this campaign? This cannot be undone.');
        if (!confirmed) return;
        setActionLoading(campaignId);
        try {
            await sdk.ads.deleteCampaign(campaignId);
            await loadCampaigns();
        } catch (error) {
            console.error('Failed to end campaign:', error);
        } finally {
            setActionLoading(null);
        }
    }

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(cents / 100);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const getStatusBadge = (status: string) => {
        const badges: Record<string, { bg: string; text: string }> = {
            ACTIVE: { bg: 'bg-green-500/10', text: 'text-green-400' },
            PAUSED: { bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
            DRAFT: { bg: 'bg-gray-500/10', text: 'text-gray-400' },
            ENDED: { bg: 'bg-red-500/10', text: 'text-red-400' },
        };
        const badge = badges[status] || badges.DRAFT;
        return (
            <span className={`inline-flex items-center rounded-full ${badge.bg} px-2 py-1 text-xs font-medium ${badge.text}`}>
                {status}
            </span>
        );
    };

    const getTypeBadge = (type?: string) => {
        if (!type) return null;
        const labels: Record<string, string> = {
            PROPERTY_BOOST: 'Property Boost',
            BANNER: 'Banner',
            SEARCH_SPONSOR: 'Search Sponsor',
        };
        return (
            <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-400">
                {labels[type] || type}
            </span>
        );
    };

    const calculateStats = (campaign: Campaign) => {
        if (!campaign.stats || campaign.stats.length === 0) {
            return { impressions: 0, clicks: 0, ctr: '0.00' };
        }
        const impressions = campaign.stats.reduce((sum, s) => sum + s.impressions, 0);
        const clicks = campaign.stats.reduce((sum, s) => sum + s.clicks, 0);
        const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00';
        return { impressions, clicks, ctr };
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Campaigns</h1>
                <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => window.location.href = '/dashboard/advertiser/campaigns/create'}
                >
                    + Create Campaign
                </Button>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-20 bg-white/5 animate-pulse rounded-lg" />
                    ))}
                </div>
            ) : campaigns.length === 0 ? (
                <Card className="bg-white border-slate-200">
                    <CardContent className="py-12 text-center">
                        <p className="text-slate-500 text-lg mb-4">No campaigns yet</p>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => window.location.href = '/dashboard/advertiser/campaigns/create'}
                        >
                            Create Your First Campaign
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Card className="bg-white border-slate-200 overflow-hidden">
                    <CardContent className="p-0">
                        <table className="w-full text-left text-sm text-slate-700">
                            <thead className="bg-slate-50 text-slate-500">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Campaign</th>
                                    <th className="px-6 py-3 font-medium">Type</th>
                                    <th className="px-6 py-3 font-medium">Status</th>
                                    <th className="px-6 py-3 font-medium">Impressions</th>
                                    <th className="px-6 py-3 font-medium">Clicks</th>
                                    <th className="px-6 py-3 font-medium">CTR</th>
                                    <th className="px-6 py-3 font-medium">Spent</th>
                                    <th className="px-6 py-3 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {campaigns.map((campaign) => {
                                    const stats = calculateStats(campaign);
                                    return (
                                        <tr key={campaign.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <div className="font-medium text-slate-900">{campaign.name}</div>
                                                    <div className="text-xs text-slate-500">
                                                        {formatDate(campaign.startAt)}
                                                        {campaign.endAt && ` - ${formatDate(campaign.endAt)}`}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">{getTypeBadge(campaign.type)}</td>
                                            <td className="px-6 py-4">{getStatusBadge(campaign.status)}</td>
                                            <td className="px-6 py-4">{stats.impressions.toLocaleString()}</td>
                                            <td className="px-6 py-4">{stats.clicks.toLocaleString()}</td>
                                            <td className="px-6 py-4">{stats.ctr}%</td>
                                            <td className="px-6 py-4">{formatCurrency(campaign.spentCents)}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2">
                                                    {campaign.status === 'ACTIVE' ? (
                                                        <button
                                                            className="text-amber-600 hover:text-amber-500 text-sm disabled:opacity-50"
                                                            onClick={() => handlePause(campaign.id)}
                                                            disabled={actionLoading === campaign.id}
                                                        >
                                                            {actionLoading === campaign.id ? 'Pausing...' : 'Pause'}
                                                        </button>
                                                    ) : campaign.status === 'PAUSED' ? (
                                                        <button
                                                            className="text-emerald-600 hover:text-emerald-500 text-sm disabled:opacity-50"
                                                            onClick={() => handleResume(campaign.id)}
                                                            disabled={actionLoading === campaign.id}
                                                        >
                                                            {actionLoading === campaign.id ? 'Resuming...' : 'Resume'}
                                                        </button>
                                                    ) : null}
                                                    <a
                                                        href={`/dashboard/advertiser/campaigns/${campaign.id}`}
                                                        className="text-blue-600 hover:text-blue-500 text-sm"
                                                    >
                                                        View
                                                    </a>
                                                    <a
                                                        href={`/dashboard/advertiser/campaigns/${campaign.id}/edit`}
                                                        className="text-indigo-600 hover:text-indigo-500 text-sm"
                                                    >
                                                        Edit
                                                    </a>
                                                    <button
                                                        className="text-red-600 hover:text-red-500 text-sm disabled:opacity-50"
                                                        onClick={() => handleDelete(campaign.id)}
                                                        disabled={actionLoading === campaign.id}
                                                    >
                                                        {actionLoading === campaign.id ? 'Ending...' : 'Delete'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
