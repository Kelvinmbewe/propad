'use client';
'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@propad/ui';
import { Loader2 } from 'lucide-react';

export default function AdminAds() {
    const sdk = useAuthenticatedSDK();

    const { data, isLoading, isError } = useQuery({
        queryKey: ['admin-ads-analytics'],
        enabled: !!sdk,
        queryFn: async () => sdk!.ads.getAdminAnalytics()
    });

    const campaigns = data?.campaigns ?? [];
    const stats = data?.stats ?? {};

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-white">Ads Management</h1>
                <Button className="bg-[color:var(--aurora-color-accent)] text-white">Global Stats</Button>
            </div>

            {isLoading && (
                <div className="flex h-40 items-center justify-center text-white/80">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </div>
            )}

            {isError && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-red-100">
                    Failed to load ads analytics. Please try again.
                </div>
            )}

            {!isLoading && !isError && (
                <>
                    <Card className="bg-white/5 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-white">Overview</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-3 text-white/90">
                            <Stat label="Active campaigns" value={stats.activeCampaigns ?? 0} />
                            <Stat label="Impressions (30d)" value={stats.impressions30d ?? 0} />
                            <Stat label="Spend (30d)" value={`$${((stats.spend30d ?? 0) / 100).toFixed(2)}`} />
                        </CardContent>
                    </Card>

                    <Card className="bg-white/5 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-white">Campaigns</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {campaigns.length === 0 ? (
                                <div className="text-gray-300 italic">No campaigns available.</div>
                            ) : (
                                <div className="space-y-3 text-white/90">
                                    {campaigns.map((c: any) => (
                                        <div key={c.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="font-semibold">{c.name || 'Untitled campaign'}</div>
                                                    <div className="text-sm text-white/70">{c.status}</div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Badge variant="outline" className="border-white/40 text-white">{c.channel || 'N/A'}</Badge>
                                                    <Badge variant="outline" className="border-white/40 text-white">${((c.spendCents ?? 0) / 100).toFixed(2)}</Badge>
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
        </div>
    );
}

function Stat({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs uppercase tracking-wide text-white/70">{label}</div>
            <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
        </div>
    );
}

