'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Loader2, MapPin, CheckCircle, Clock, User, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Badge } from '@propad/ui';
import type { SiteVisit } from '@propad/sdk';
import { useState } from 'react';
import { toast } from 'sonner';

export default function SiteVisitsPage() {
    const { data: session } = useSession();
    const sdk = useAuthenticatedSDK();
    const queryClient = useQueryClient();
    const role = session?.user?.role;
    const isAdmin = role === 'ADMIN';

    // Toggle between "All Pending" (Admin) and "My Assignments"
    const [viewMode, setViewMode] = useState<'PENDING' | 'MINE'>(isAdmin ? 'PENDING' : 'MINE');

    const { data: visits, isLoading } = useQuery({
        queryKey: ['site-visits', viewMode],
        enabled: !!sdk,
        queryFn: async () => {
            if (viewMode === 'PENDING') return sdk!.siteVisits.listPending();
            return sdk!.siteVisits.listMyAssignments();
        }
    });

    const assignMutation = useMutation({
        mutationFn: async ({ visitId, moderatorId }: { visitId: string; moderatorId: string }) => {
            return sdk!.siteVisits.assign(visitId, moderatorId);
        },
        onSuccess: () => {
            toast.success('Moderator assigned');
            queryClient.invalidateQueries({ queryKey: ['site-visits'] });
        },
        onError: () => toast.error('Failed to assign moderator')
    });

    const completeMutation = useMutation({
        mutationFn: async ({ visitId, lat, lng, notes }: { visitId: string; lat: number; lng: number; notes: string }) => {
            return sdk!.siteVisits.complete(visitId, { gpsLat: lat, gpsLng: lng, notes });
        },
        onSuccess: () => {
            toast.success('Visit completed');
            queryClient.invalidateQueries({ queryKey: ['site-visits'] });
        },
        onError: () => toast.error('Failed to complete visit')
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

            {!visits?.length ? (
                <EmptyState viewMode={viewMode} />
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {visits.map((visit) => (
                        <VisitCard
                            key={visit.id}
                            visit={visit}
                            onAssign={(modId) => assignMutation.mutate({ visitId: visit.id, moderatorId: modId })}
                            onComplete={(notes) => {
                                // Mock GPS for demo purposes if browser geo fails or dev env
                                // In real app, utilize navigator.geolocation
                                const lat = visit.property?.lat || -17.824858;
                                const lng = visit.property?.lng || 31.053028;
                                completeMutation.mutate({ visitId: visit.id, lat, lng, notes });
                            }}
                            isProcessing={assignMutation.isPending || completeMutation.isPending}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function VisitCard({ visit, onAssign, onComplete, isProcessing }: {
    visit: SiteVisit;
    onAssign: (id: string) => void;
    onComplete: (notes: string) => void;
    isProcessing: boolean;
}) {
    // For demo simplicity, assigning self if pending
    const statusColor = {
        PENDING_ASSIGNMENT: 'bg-amber-100 text-amber-700',
        ASSIGNED: 'bg-blue-100 text-blue-700',
        IN_PROGRESS: 'bg-blue-100 text-blue-700',
        COMPLETED: 'bg-green-100 text-green-700',
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

                {visit.visitsGpsLat && (
                    <div className="text-xs bg-neutral-50 p-2 rounded border border-neutral-100">
                        GPS Verified: {visit.distanceFromSubmittedGps?.toFixed(2)}km delta
                    </div>
                )}

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
                        <Button
                            size="sm"
                            className="w-full bg-green-600 hover:bg-green-700"
                            disabled={isProcessing}
                            onClick={() => {
                                const notes = prompt('Visit Notes:');
                                if (notes) onComplete(notes);
                            }}
                        >
                            Complete Visit
                        </Button>
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
