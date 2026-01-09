'use client';

import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@propad/ui';
import { ShieldAlert, Unlock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

export default function SecurityPage() {
    const sdk = useAuthenticatedSDK();
    const queryClient = useQueryClient();

    const { data: events, isLoading } = useQuery({
        queryKey: ['admin', 'security', 'events'],
        queryFn: async () => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/security/events`, {
                headers: { Authorization: `Bearer ${sdk?.accessToken}` }
            });
            return res.json();
        }
    });

    const unlockUser = useMutation({
        mutationFn: async (userId: string) => {
            await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/security/unlock/${userId}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${sdk?.accessToken}` }
            });
        },
        onSuccess: () => {
            alert('User unlocked');
            queryClient.invalidateQueries({ queryKey: ['admin', 'security', 'events'] });
        }
    });

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">Security Audit</h1>
            <p className="text-sm text-neutral-500">Monitoring suspicious activities and account locks.</p>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5" /> Risk Events Log
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? <div>Loading...</div> : (
                        <div className="space-y-4">
                            {events?.map((evt: any) => (
                                <div key={evt.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-neutral-50">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <Badge variant={
                                                evt.severity === 'CRITICAL' ? 'destructive' :
                                                    evt.severity === 'HIGH' ? 'destructive' :
                                                        'secondary'
                                            }>{evt.severity}</Badge>
                                            <span className="font-medium text-sm">{evt.type}</span>
                                        </div>
                                        <div className="text-xs text-neutral-500">
                                            User: {evt.user?.email || evt.userId || 'Anonymous'} • {formatDistanceToNow(new Date(evt.createdAt), { addSuffix: true })}
                                        </div>
                                    </div>
                                    {evt.type === 'ACCOUNT_LOCKED' && (
                                        <Button size="sm" variant="outline" onClick={() => unlockUser.mutate(evt.userId)}>
                                            <Unlock className="mr-2 h-3 w-3" /> Unlock
                                        </Button>
                                    )}
                                </div>
                            ))}
                            {events?.length === 0 && <div className="text-sm text-neutral-500">No security events found.</div>}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
