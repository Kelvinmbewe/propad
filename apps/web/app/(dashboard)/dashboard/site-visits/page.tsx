'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

import { Loader2, MapPin, Clock, User, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Badge } from '@propad/ui';
import type { SiteVisit } from '@propad/sdk';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useSdkClient } from '@/hooks/use-sdk-client';
import { ClientState } from '@/components/client-state';

export default function SiteVisitsPage() {
    const { sdk, status, message, accessToken, apiBaseUrl } = useSdkClient();
    const { data: session } = useSession();
    const queryClient = useQueryClient();
    const searchParams = useSearchParams();
    const focusedVisitId = searchParams.get('visitId');
    const role = session?.user?.role;
    const isAdmin = role === 'ADMIN';

    // Toggle between "All Pending" (Admin) and "My Assignments"
    const [viewMode, setViewMode] = useState<'PENDING' | 'MINE'>(isAdmin ? 'PENDING' : 'MINE');

    const { data: visits, isLoading, isError } = useQuery({
        queryKey: ['site-visits', viewMode],
        enabled: status === 'ready',
        queryFn: async () => {
            if (!sdk) {
                return [];
            }
            if (viewMode === 'PENDING') return sdk.siteVisits.listPending();
            return sdk.siteVisits.listMyAssignments();
        }
    });
"use client";

    const { data: focusedVisit, isLoading: loadingFocused } = useQuery({
        queryKey: ['site-visits', 'focus', focusedVisitId],
        enabled: status === 'ready' && !!focusedVisitId,
        queryFn: async () => {
            if (!focusedVisitId) {
                return null;
            }
            if (sdk && 'get' in sdk.siteVisits) {
                return sdk.siteVisits.get(focusedVisitId);
            }
            if (!apiBaseUrl || !accessToken) {
                return null;
            }
            const res = await fetch(`${apiBaseUrl}/site-visits/${focusedVisitId}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });
            if (!res.ok) {
                throw new Error('Failed to load site visit');
            }
            return res.json();
        }
    });

    const combinedVisits = useMemo(() => {
        const list = Array.isArray(visits) ? visits : [];
        if (focusedVisit && !list.some((visit) => visit.id === focusedVisit.id)) {
            return [focusedVisit, ...list];
        }
        return list;
    }, [visits, focusedVisit]);

    const assignMutation = useMutation({
        mutationFn: async ({ visitId, moderatorId }: { visitId: string; moderatorId: string }) => {
            if (!sdk) {
                throw new Error('Site visit client not ready');
            }
            return sdk.siteVisits.assign(visitId, moderatorId);
        },
        onSuccess: () => {
            toast.success('Moderator assigned');
            queryClient.invalidateQueries({ queryKey: ['site-visits'] });
        },
        onError: () => toast.error('Failed to assign moderator')
    });

    const completeMutation = useMutation({
        mutationFn: async ({ visitId, lat, lng, notes }: { visitId: string; lat: number; lng: number; notes?: string }) => {
            if (!apiBaseUrl || !accessToken) {
                throw new Error('Missing API configuration');
            }
            const res = await fetch(`${apiBaseUrl}/site-visits/${visitId}/complete`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ gpsLat: lat, gpsLng: lng, notes })
            });
            if (!res.ok) throw new Error('Failed to complete visit');
            return res.json();
        },
        onSuccess: () => {
            toast.success('Visit completed');
            queryClient.invalidateQueries({ queryKey: ['site-visits'] });
        },
        onError: () => toast.error('Failed to complete visit')
    });

    const declineMutation = useMutation({
        mutationFn: async ({ visitId, reason }: { visitId: string; reason?: string }) => {
            if (!sdk) {
                throw new Error('Site visit client not ready');
            }
            return sdk.siteVisits.decline(visitId, { reason });
        },
        onSuccess: () => {
            toast.success('Visit declined');
            queryClient.invalidateQueries({ queryKey: ['site-visits'] });
        },
        onError: () => toast.error('Failed to decline visit')
    });

    if (status !== 'ready') {
        return <ClientState status={status} message={message} title="Site visits" />;
    }

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-neutral-900">Site Visits</h1>
                    <p className="text-sm text-neutral-600">
                        {viewMode === 'PENDING' ? 'Pending verification requests awaiting assignment' : 'My assigned active visits'}
                    </p>
                </div>

                {isAdmin && (
                    <div className="flex gap-2 bg-neutral-100 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('PENDING')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${viewMode === 'PENDING' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'}`}
                        >
                            Pending Queue
                        </button>
                        <button
                            onClick={() => setViewMode('MINE')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${viewMode === 'MINE' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'}`}
                        >
                            My Assignments
                        </button>
                    </div>
                )}
            </header>

            {isLoading || loadingFocused ? (
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
                </div>
            ) : isError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-600">
                    Unable to load site visits right now. Please try again.
                </div>
            ) : focusedVisitId && !focusedVisit && !combinedVisits.length ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-700">
                    We could not load that site visit. Make sure you have access or refresh the page.
                </div>
            ) : !combinedVisits.length ? (
                <EmptyState viewMode={viewMode} />
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {combinedVisits.map((visit) => (
                        <VisitCard
                            key={visit.id}
                            visit={visit}
                            onAssign={(modId) => assignMutation.mutate({ visitId: visit.id, moderatorId: modId })}
                            onComplete={(lat, lng, notes) => completeMutation.mutate({ visitId: visit.id, lat, lng, notes })}
                            onDecline={(reason) => declineMutation.mutate({ visitId: visit.id, reason })}
                            isProcessing={
                                assignMutation.isPending ||
                                completeMutation.isPending ||
                                declineMutation.isPending
                            }
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function VisitCard({ visit, onAssign, onComplete, onDecline, isProcessing }: {
    visit: SiteVisit;
    onAssign: (id: string) => void;
    onComplete: (lat: number, lng: number, notes?: string) => void;
    onDecline: (reason?: string) => void;
    isProcessing: boolean;
}) {
    // For demo simplicity, assigning self if pending
    const statusColor = {
        PENDING_ASSIGNMENT: 'bg-amber-100 text-amber-700',
        ASSIGNED: 'bg-blue-100 text-blue-700',
        IN_PROGRESS: 'bg-blue-100 text-blue-700',
        COMPLETED: 'bg-green-100 text-green-700',
        FAILED: 'bg-red-100 text-red-700',
        CANCELLED: 'bg-red-100 text-red-700',
    }[visit.status] || 'bg-neutral-100 text-neutral-700';

    const { data: session } = useSession();
    const currentUserId = session?.user?.id;

    return (
        <Card className="flex flex-col">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <Badge variant="secondary" className={statusColor}>
                        {visit.status.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs text-neutral-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(visit.createdAt), 'MMM d')}
                    </span>
                </div>
                <CardTitle className="text-base mt-2 line-clamp-1">
                    {visit.property?.title || 'Untitled Property'}
                </CardTitle>
                <CardDescription className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {visit.property?.suburbName || 'Unknown Location'}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4 text-sm">
                <div className="flex items-center gap-3 text-neutral-600">
                    <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-neutral-400" />
                        <span>Req: {visit.requestedBy?.name?.split(' ')[0] || 'Unknown'}</span>
                    </div>
                </div>

                {visit.assignedModeratorId && (visit as any).assignedModerator ? (
                    <div className="text-xs bg-blue-50 p-2 rounded border border-blue-100">
                        <div className="flex items-center gap-2">
                            <UserCheck className="w-3 h-3 text-blue-600" />
                            <span className="text-blue-800">
                                Assigned to: <strong>{(visit as any).assignedModerator?.name || (visit as any).assignedModerator?.email || 'Unknown'}</strong>
                            </span>
                        </div>
                    </div>
                ) : null}

                {visit.status === 'COMPLETED' && typeof visit.visitGpsLat === 'number' && visit.distanceFromSubmittedGps !== null && visit.distanceFromSubmittedGps !== undefined ? (
                    <div className="text-xs bg-emerald-50 p-2 rounded border border-emerald-100">
                        <div className="flex items-center gap-2">
                            <MapPin className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-800">
                                Distance delta: <strong>{visit.distanceFromSubmittedGps.toFixed(2)}km</strong>
                            </span>
                        </div>
                    </div>
                ) : null}

                <div className="mt-auto pt-2 border-t border-neutral-100 flex gap-2">
                    {visit.status === 'PENDING_ASSIGNMENT' && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            disabled={isProcessing}
                            onClick={() => currentUserId && onAssign(currentUserId)}
                        >
                            Assign to Me
                        </Button>
                    )}

                    {visit.status === 'ASSIGNED' && visit.assignedModeratorId === currentUserId && (
                        <>
                            <Button
                                size="sm"
                                className="w-full bg-green-600 hover:bg-green-700"
                                disabled={isProcessing}
                                onClick={async () => {
                                    // "Start Visit" → upload GPS
                                    const getGPS = (): Promise<{ lat: number; lng: number }> => {
                                        return new Promise((resolve) => {
                                            if (navigator.geolocation) {
                                                navigator.geolocation.getCurrentPosition(
                                                    (position) => {
                                                        resolve({
                                                            lat: position.coords.latitude,
                                                            lng: position.coords.longitude
                                                        });
                                                    },
                                                    () => {
                                                        // Fallback if GPS fails
                                                        resolve({
                                                            lat: visit.property?.lat || -17.824858,
                                                            lng: visit.property?.lng || 31.053028
                                                        });
                                                    }
                                                );
                                            } else {
                                                // Fallback if geolocation not available
                                                resolve({
                                                    lat: visit.property?.lat || -17.824858,
                                                    lng: visit.property?.lng || 31.053028
                                                });
                                            }
                                        });
                                    };

                                    const { lat, lng } = await getGPS();
                                    const notes = prompt('Visit Notes (optional):') || undefined;
                                    onComplete(lat, lng, notes);
                                }}
                            >
                                Start Visit
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="w-full text-red-600 border-red-200 hover:bg-red-50"
                                disabled={isProcessing}
                                onClick={() => {
                                    const reason = prompt('Reason for decline (optional):') || undefined;
                                    onDecline(reason);
                                }}
                            >
                                Unable to Complete
                            </Button>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function EmptyState({ viewMode }: { viewMode: string }) {
    return (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-neutral-200 rounded-lg bg-neutral-50/50">
            <div className="p-3 bg-neutral-100 rounded-full mb-3">
                {viewMode === 'PENDING' ? <Clock className="w-6 h-6 text-neutral-400" /> : <UserCheck className="w-6 h-6 text-neutral-400" />}
            </div>
            <p className="font-medium text-neutral-900">No visits found</p>
            <p className="text-sm text-neutral-500 mt-1">
                {viewMode === 'PENDING' ? 'No pending verification requests.' : 'You have no assigned site visits.'}
            </p>
        </div>
    );
}
