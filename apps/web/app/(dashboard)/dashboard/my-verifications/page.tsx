'use client';

import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';
import { Card, CardContent, CardHeader, CardTitle, Badge, Skeleton, Button } from '@propad/ui';
import { ShieldCheck, MapPin, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

export default function MyVerificationsPage() {
    const sdk = useAuthenticatedSDK();

    const { data: requests, isLoading } = useQuery({
        queryKey: ['verifications', 'my'],
        queryFn: async () => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/verifications/my`, {
                headers: { Authorization: `Bearer ${sdk?.accessToken}` }
            });
            return res.json();
        }
    });

    if (isLoading) return <Skeleton className="h-64 w-full" />;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">My Verifications</h1>
                    <p className="text-sm text-neutral-500">Track your verification requests.</p>
                </div>
                <Button>
                    <Plus className="h-4 w-4 mr-2" /> New Request
                </Button>
            </div>

            {(!requests || requests.length === 0) ? (
                <Card>
                    <CardContent className="p-8 text-center">
                        <ShieldCheck className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                        <p className="text-neutral-500">No verification requests found.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {requests.map((req: any) => (
                        <Card key={req.id}>
                            <CardContent className="p-6 flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        {req.targetType === 'PROPERTY' && <MapPin className="h-4 w-4 text-gray-500" />}
                                        <h3 className="font-semibold">{req.property?.title || req.targetType}</h3>
                                        <Badge variant={
                                            req.status === 'APPROVED' ? 'default' :
                                                req.status === 'REJECTED' ? 'destructive' : 'secondary'
                                        }>{req.status}</Badge>
                                    </div>
                                    <p className="text-sm text-gray-500">Submitted on {new Date(req.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium">{req.items.length} items</p>
                                    <p className="text-xs text-gray-500">
                                        {req.items.filter((i: any) => i.status === 'APPROVED').length} approved
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
