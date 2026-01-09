'use client';

import { useState } from 'react';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';
import { Card, CardContent, CardHeader, CardTitle, Button, Switch, Badge } from '@propad/ui';
import { Activity, ShieldAlert, Cpu, Settings, RefreshCw } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function OpsPage() {
    const sdk = useAuthenticatedSDK();
    const queryClient = useQueryClient();

    const { data: metrics, isLoading: metricsLoading } = useQuery({
        queryKey: ['metrics', 'system'],
        queryFn: async () => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/metrics/system`, {
                headers: { Authorization: `Bearer ${sdk?.accessToken}` }
            });
            return res.json();
        }
    });

    const { data: flags, isLoading: flagsLoading } = useQuery({
        queryKey: ['ops', 'flags'],
        queryFn: async () => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/ops/flags`, {
                headers: { Authorization: `Bearer ${sdk?.accessToken}` }
            });
            return res.json();
        }
    });

    const toggleFlag = useMutation({
        mutationFn: async ({ key, enabled }: { key: string, enabled: boolean }) => {
            await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/ops/flags`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${sdk?.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ key, enabled })
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ops', 'flags'] });
        }
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Operational Control</h1>
                    <p className="text-sm text-neutral-500">System health monitoring and feature management.</p>
                </div>
                <Button variant="outline" onClick={() => queryClient.invalidateQueries()}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Risk Events (24h)</CardTitle>
                        <ShieldAlert className={`h-4 w-4 ${metrics?.integrity?.riskEvents24h > 0 ? 'text-red-500' : 'text-neutral-500'}`} />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics?.integrity?.riskEvents24h ?? '-'}</div>
                        <p className="text-xs text-neutral-500">New anomalies detected</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Backlog</CardTitle>
                        <Activity className="h-4 w-4 text-neutral-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics?.verifications?.backlog ?? '-'}</div>
                        <p className="text-xs text-neutral-500">Pending Verifications</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Failed Payouts</CardTitle>
                        <Cpu className="h-4 w-4 text-neutral-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics?.payouts?.failedTotal ?? '-'}</div>
                        <p className="text-xs text-neutral-500">Requires manual intervention</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" /> Feature Flags
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {flagsLoading ? <div>Loading flags...</div> : (
                        <div className="space-y-4">
                            {flags?.map((flag: any) => (
                                <div key={flag.key} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="space-y-0.5">
                                        <div className="font-medium">{flag.key}</div>
                                        <div className="text-xs text-neutral-500">{flag.description || 'No description'}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={flag.enabled ? 'success' : 'secondary'}>
                                            {flag.enabled ? 'ENABLED' : 'DISABLED'}
                                        </Badge>
                                        <Switch
                                            checked={flag.enabled}
                                            onCheckedChange={(checked) => toggleFlag.mutate({ key: flag.key, enabled: checked })}
                                        />
                                    </div>
                                </div>
                            ))}
                            {flags?.length === 0 && <div className="text-sm text-neutral-500">No flags configured.</div>}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
