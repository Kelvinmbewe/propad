'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input, Label } from '@propad/ui';
import { Loader2 } from 'lucide-react';

const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function AdminAds() {
    const sdk = useAuthenticatedSDK();
    const [placementForm, setPlacementForm] = useState({
        code: '',
        name: '',
        description: '',
        page: 'HOME',
        position: 'HEADER',
        allowedTypes: ['IMAGE'] as string[],
    });
    const [placementMessage, setPlacementMessage] = useState<string | null>(null);
    const [topupAdvertiserId, setTopupAdvertiserId] = useState('');
    const [topupAmount, setTopupAmount] = useState('');
    const [topupMessage, setTopupMessage] = useState<string | null>(null);

    const analyticsQuery = useQuery({
        queryKey: ['admin-ads-analytics'],
        enabled: !!sdk,
        queryFn: async () => sdk!.ads.getAdminAnalytics()
    });

    const campaignsQuery = useQuery({
        queryKey: ['admin-ads-campaigns'],
        enabled: !!sdk,
        queryFn: async () => sdk!.ads.getMyCampaigns()
    });

    const placementsQuery = useQuery({
        queryKey: ['admin-ads-placements'],
        enabled: !!sdk,
        queryFn: async () => sdk!.ads.getPlacements()
    });
    const advertisersQuery = useQuery({
        queryKey: ['admin-ads-advertisers'],
        enabled: !!sdk,
        queryFn: async () => sdk!.ads.getAdvertisers()
    });

    const analytics = analyticsQuery.data;
    const campaigns = campaignsQuery.data ?? [];
    const placements = placementsQuery.data ?? [];
    const advertisers = advertisersQuery.data ?? [];
    const isLoading = analyticsQuery.isLoading || campaignsQuery.isLoading;
    const analyticsError = analyticsQuery.isError;
    const campaignsError = campaignsQuery.isError;

    const currentStats = analytics?.summary?.current ?? {
        impressions: 0,
        clicks: 0,
        ctr: 0,
        spendCents: 0,
    };
    const activeCampaigns = campaigns.filter((c: any) => c.status === 'ACTIVE').length;

    const campaignSpend = (stats?: Array<{ revenueMicros: number }>) => {
        if (!stats || stats.length === 0) return 0;
        const micros = stats.reduce((sum, item) => sum + (item.revenueMicros ?? 0), 0);
        return Math.floor(micros / 10000);
    };

    const toggleAllowedType = (type: string) => {
        setPlacementForm((current) => {
            const hasType = current.allowedTypes.includes(type);
            return {
                ...current,
                allowedTypes: hasType
                    ? current.allowedTypes.filter((item) => item !== type)
                    : [...current.allowedTypes, type]
            };
        });
    };

    const handleCreatePlacement = async () => {
        if (!sdk) return;
        if (!placementForm.code.trim() || !placementForm.name.trim()) {
            setPlacementMessage('Code and name are required.');
            return;
        }

        try {
            await sdk.ads.createPlacement({
                code: placementForm.code.trim(),
                name: placementForm.name.trim(),
                description: placementForm.description.trim() || undefined,
                page: placementForm.page,
                position: placementForm.position,
                allowedTypes: placementForm.allowedTypes,
            });
            setPlacementMessage('Placement created.');
            setPlacementForm({
                code: '',
                name: '',
                description: '',
                page: 'HOME',
                position: 'HEADER',
                allowedTypes: ['IMAGE']
            });
            await placementsQuery.refetch();
        } catch (error: any) {
            setPlacementMessage(error?.message || 'Failed to create placement.');
        }
    };

    const handleAdminTopup = async () => {
        if (!sdk) return;
        if (!topupAdvertiserId) {
            setTopupMessage('Select an advertiser.');
            return;
        }
        const amount = parseFloat(topupAmount);
        if (!amount || amount <= 0) {
            setTopupMessage('Enter a valid amount.');
            return;
        }

        try {
            await sdk.ads.topUp(topupAdvertiserId, Math.round(amount * 100));
            setTopupAmount('');
            setTopupMessage('Top up successful.');
        } catch (error: any) {
            setTopupMessage(error?.message || 'Failed to top up advertiser.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Ads Management</h1>
                <Button className="bg-[color:var(--aurora-color-accent)] text-white">Global Stats</Button>
            </div>

            {!sdk && (
                <div className="rounded-lg border border-slate-200 bg-white p-4 text-slate-600">
                    Ads analytics requires an authenticated session.
                </div>
            )}

            {isLoading && (
                <div className="flex h-40 items-center justify-center text-white/80">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </div>
            )}

            {(analyticsError || campaignsError) && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
                    {analyticsError && campaignsError
                        ? 'Failed to load ads analytics and campaigns.'
                        : analyticsError
                            ? 'Failed to load ads analytics.'
                            : 'Failed to load ad campaigns.'}
                </div>
            )}

            {!isLoading && analytics && (
                <>
                    <Card className="bg-white border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-slate-900">Overview</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-4 text-slate-900">
                            <Stat label="Active campaigns" value={activeCampaigns} />
                            <Stat label="Impressions (30d)" value={currentStats.impressions ?? 0} />
                            <Stat label="Clicks (30d)" value={currentStats.clicks ?? 0} />
                            <Stat label="Spend (30d)" value={formatCurrency(currentStats.spendCents ?? 0)} />
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-slate-900">Performance by Type</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-3 md:grid-cols-3">
                            {(analytics.byType ?? []).map((row: any) => (
                                <div key={row.type} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                    <div className="text-xs uppercase tracking-wide text-slate-500">{row.type}</div>
                                    <div className="mt-2 text-lg font-semibold text-slate-900">{row.impressions} impressions</div>
                                    <div className="text-sm text-slate-600">{row.clicks} clicks · CTR {(row.ctr * 100).toFixed(2)}%</div>
                                    <div className="text-sm text-slate-600">Spend {formatCurrency(row.spendCents ?? 0)}</div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-slate-900">Campaigns</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {campaignsError ? (
                                <div className="text-red-600">Unable to load campaigns.</div>
                            ) : campaigns.length === 0 ? (
                                <div className="text-slate-500 italic">No campaigns available.</div>
                            ) : (
                                <div className="space-y-3 text-slate-900">
                                    {campaigns.map((campaign: any) => (
                                        <div key={campaign.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                                <div>
                                                    <div className="font-semibold">{campaign.name || 'Untitled campaign'}</div>
                                                    <div className="text-sm text-slate-600">{campaign.status}</div>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Badge variant="outline" className="border-slate-300 text-slate-700">
                                                        {campaign.type || 'UNKNOWN'}
                                                    </Badge>
                                                    <Badge variant="outline" className="border-slate-300 text-slate-700">
                                                        {formatCurrency(campaignSpend(campaign.stats))}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                </>
            )}
            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="bg-white border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-slate-900">Advertiser Top Up</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-slate-700">Advertiser</Label>
                            <select
                                value={topupAdvertiserId}
                                onChange={(event) => setTopupAdvertiserId(event.target.value)}
                                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                            >
                                <option value="">Select advertiser</option>
                                {advertisers.map((advertiser: any) => {
                                    const ownerName = advertiser.owner?.name || advertiser.owner?.email;
                                    const displayName =
                                        advertiser.name && advertiser.name !== 'Unknown'
                                            ? advertiser.name
                                            : ownerName || advertiser.contactEmail || 'Unknown';
                                    const detail = advertiser.contactEmail && advertiser.contactEmail !== displayName
                                        ? `• ${advertiser.contactEmail}`
                                        : '';
                                    const suffix = `(${advertiser.id.slice(-6)})`;
                                    return (
                                        <option key={advertiser.id} value={advertiser.id}>
                                            {displayName} {detail} {suffix}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-700">Amount (USD)</Label>
                            <Input
                                value={topupAmount}
                                onChange={(event) => setTopupAmount(event.target.value)}
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="100.00"
                            />
                        </div>
                        {topupMessage && (
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                                {topupMessage}
                            </div>
                        )}
                        <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={handleAdminTopup}>
                            Top Up Advertiser
                        </Button>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-slate-900">Ad Placements</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label className="text-slate-700">Code</Label>
                            <Input
                                value={placementForm.code}
                                onChange={(event) => setPlacementForm((current) => ({
                                    ...current,
                                    code: event.target.value
                                }))}
                                placeholder="HOME_HEADER"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-700">Name</Label>
                            <Input
                                value={placementForm.name}
                                onChange={(event) => setPlacementForm((current) => ({
                                    ...current,
                                    name: event.target.value
                                }))}
                                placeholder="Homepage Header Banner"
                            />
                        </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label className="text-slate-700">Page</Label>
                        <select
                                value={placementForm.page}
                                onChange={(event) => setPlacementForm((current) => ({
                                    ...current,
                                    page: event.target.value
                                }))}
                                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                            >
                                {['HOME', 'SEARCH', 'DETAIL', 'ARTICLE', 'GLOBAL'].map((page) => (
                                    <option key={page} value={page} className="text-slate-900">{page}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-700">Position</Label>
                        <select
                                value={placementForm.position}
                                onChange={(event) => setPlacementForm((current) => ({
                                    ...current,
                                    position: event.target.value
                                }))}
                                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                            >
                                {['HEADER', 'SIDEBAR', 'INLINE', 'FOOTER', 'INTERSTITIAL'].map((pos) => (
                                    <option key={pos} value={pos} className="text-slate-900">{pos}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-slate-700">Allowed creative types</Label>
                        <div className="flex flex-wrap gap-2">
                            {['IMAGE', 'HTML', 'SCRIPT'].map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => toggleAllowedType(type)}
                                    className={`rounded-full border px-3 py-1 text-xs ${placementForm.allowedTypes.includes(type)
                                        ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
                                        : 'border-slate-200 text-slate-500'
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-slate-700">Description</Label>
                        <Input
                            value={placementForm.description}
                            onChange={(event) => setPlacementForm((current) => ({
                                ...current,
                                description: event.target.value
                            }))}
                            placeholder="Appears on homepage above fold"
                        />
                    </div>
                    {placementMessage && (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                            {placementMessage}
                        </div>
                    )}
                    <Button
                        className="bg-emerald-500 text-white hover:bg-emerald-600"
                        onClick={handleCreatePlacement}
                    >
                        Add Placement
                    </Button>

                    <div className="space-y-2">
                        {placements.length === 0 ? (
                            <div className="text-slate-500 text-sm">No placements yet.</div>
                        ) : (
                            placements.map((placement: any) => (
                                <div key={placement.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-900">
                                    <div className="font-semibold">{placement.name}</div>
                                    <div className="text-xs text-slate-500">{placement.code} · {placement.page} / {placement.position}</div>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {(placement.allowedTypes ?? []).map((type: string) => (
                                            <Badge key={type} variant="outline" className="border-slate-300 text-slate-700">{type}</Badge>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function Stat({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
        </div>
    );
}
