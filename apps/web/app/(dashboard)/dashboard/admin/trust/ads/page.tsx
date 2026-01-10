'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';
import { Loader2, ShieldAlert, Ban, PlayCircle, PauseCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Badge, Button } from '@propad/ui';
import { toast } from 'sonner';

export default function AdsFraudPage() {
    const sdk = useAuthenticatedSDK();
    const queryClient = useQueryClient();

    const { data: events, isLoading } = useQuery({
        queryKey: ['admin-fraud-events'],
        enabled: !!sdk,
        queryFn: async () => sdk!.admin.ads.fraud.getEvents(50)
    });

    const resolveMutation = useMutation({
        mutationFn: async ({ id, resolution }: { id: string, resolution: string }) => {
            await sdk!.admin.ads.fraud.resolve(id, resolution);
        },
        onSuccess: () => {
            toast.success('Event resolved');
            queryClient.invalidateQueries({ queryKey: ['admin-fraud-events'] });
        }
    });

    const pauseMutation = useMutation({
        mutationFn: async (id: string) => {
            await sdk!.admin.ads.fraud.pauseCampaign(id);
        },
        onSuccess: () => {
            toast.success('Campaign paused');
            queryClient.invalidateQueries({ queryKey: ['admin-fraud-events'] });
        }
    });

    if (isLoading || !sdk) {
        return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div className="space-y-6">
            <header>
                <div className="flex items-center gap-2">
                    <ShieldAlert className="h-8 w-8 text-red-600" />
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Ads Integrity & Fraud</h1>
                        <p className="text-muted-foreground">Monitor and resolve ad fraud signals.</p>
                    </div>
                </div>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Fraud Events</CardTitle>
                    <CardDescription>
                        Real-time log of blocked or flagged activities.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Severity</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead>Campaign</TableHead>
                                <TableHead>Advertiser</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead>Time</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {events?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">No recent fraud events.</TableCell>
                                </TableRow>
                            ) : (
                                events?.map((event: any) => (
                                    <TableRow key={event.id}>
                                        <TableCell>
                                            <Badge variant={event.severity === 'HIGH' ? 'destructive' : event.severity === 'MEDIUM' ? 'warning' : 'outline'}>
                                                {event.severity}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{event.reason}</TableCell>
                                        <TableCell>{event.campaign?.name || event.campaignId}</TableCell>
                                        <TableCell>{event.advertiser?.businessName || event.advertiserId}</TableCell>
                                        <TableCell>{event.score}/100</TableCell>
                                        <TableCell>{new Date(event.createdAt).toLocaleString()}</TableCell>
                                        <TableCell className="text-right flex justify-end gap-2">
                                            <Button size="icon" variant="ghost" title="Pause Campaign" onClick={() => pauseMutation.mutate(event.campaignId)}>
                                                <PauseCircle className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" title="Resolve" onClick={() => resolveMutation.mutate({ id: event.id, resolution: 'REVIEWED' })}>
                                                <CheckCircle className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
