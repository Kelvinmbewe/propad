'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';
import { ShieldAlert, Activity, User, Home, Building2, AlertTriangle, CheckCircle, Smartphone } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge, Button } from '@propad/ui';
import type { RiskEvent } from '@propad/sdk';
import { Loader2 } from 'lucide-react';

export default function AdminTrustPage() {
    const sdk = useAuthenticatedSDK();

    const { data: events, isLoading } = useQuery({
        queryKey: ['risk-events'],
        enabled: !!sdk,
        queryFn: async () => sdk!.admin.risk.events({ limit: 50 })
    });

    if (!sdk || isLoading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-2xl font-semibold text-neutral-900">Trust & Risk</h1>
                <p className="text-sm text-neutral-600">
                    Live feed of risk signals, fraud alerts, and trust score impact events.
                </p>
            </header>

            <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="h-5 w-5 text-blue-500" />
                                Recent Risk Events
                            </CardTitle>
                            <CardDescription>
                                Chronological log of system-generated risk signals.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {!events?.length ? (
                                <div className="text-center py-12 text-neutral-500 text-sm">
                                    No risk events recorded recently.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {events.map((event) => (
                                        <RiskEventRow key={event.id} event={event} />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium uppercase tracking-wide text-neutral-500">
                                Modules
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-2">
                            <Button variant="outline" className="w-full justify-start" asChild>
                                <a href="/dashboard/admin/trust/ads">
                                    <ShieldAlert className="mr-2 h-4 w-4 text-red-500" />
                                    Ads Integrity
                                </a>
                            </Button>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium uppercase tracking-wide text-neutral-500">
                                Signal Reference
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="h-4 w-4 text-red-500 mt-1" />
                                <div>
                                    <p className="font-medium text-neutral-900">GPS Mismatch</p>
                                    <p className="text-neutral-500">User location differs significantly from property coordinates.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Activity className="h-4 w-4 text-amber-500 mt-1" />
                                <div>
                                    <p className="font-medium text-neutral-900">Burst Listing</p>
                                    <p className="text-neutral-500">High volume of property creations in short timeframe.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Smartphone className="h-4 w-4 text-purple-500 mt-1" />
                                <div>
                                    <p className="font-medium text-neutral-900">Device Clustering</p>
                                    <p className="text-neutral-500">Multiple accounts accessing from same device fingerprint.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function RiskEventRow({ event }: { event: RiskEvent }) {
    const EntityIcon = {
        USER: User,
        PROPERTY: Home,
        AGENCY: Building2,
    }[event.entityType] || AlertTriangle;

    const isHighRisk = event.scoreDelta > 20;

    return (
        <div className="flex items-start gap-4 p-3 rounded-lg border border-neutral-100 bg-white hover:bg-neutral-50 transition-colors">
            <div className={`p-2 rounded-full ${isHighRisk ? 'bg-red-100 text-red-600' : 'bg-neutral-100 text-neutral-500'}`}>
                <EntityIcon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-neutral-900">
                        {event.signalType.replace(/_/g, ' ')}
                    </p>
                    <span className="text-xs text-neutral-400">
                        {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                    </span>
                </div>
                <p className="text-sm text-neutral-600 truncate">
                    {event.notes || 'No details provided'}
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="text-neutral-500 font-normal">
                        {event.entityType}: {event.entityId.slice(0, 8)}...
                    </Badge>
                    {event.scoreDelta > 0 && (
                        <span className="text-red-600 font-medium">
                            +{event.scoreDelta} Risk Score
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
