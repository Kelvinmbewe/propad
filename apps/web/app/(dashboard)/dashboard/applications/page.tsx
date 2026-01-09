'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { useUser } from '@/hooks/use-user';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { ApplicationStatus } from '@/packages/sdk/src/schemas'; // Or import from SDK directly if available
import { toast } from 'sonner';

export default function ApplicationsPage() {
    const sdk = useAuthenticatedSDK();
    const { user } = useUser();
    const queryClient = useQueryClient();

    const { data: myApplications, isLoading: isLoadingMy } = useQuery({
        queryKey: ['applications', 'my'],
        queryFn: () => sdk.applications.my(),
        enabled: !!sdk,
    });

    const { data: receivedApplications, isLoading: isLoadingReceived } = useQuery({
        queryKey: ['applications', 'received'],
        queryFn: () => sdk.applications.received(),
        enabled: !!sdk && (user?.role === 'AGENT' || user?.role === 'LANDLORD' || user?.role === 'ADMIN'),
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            sdk.applications.updateStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['applications'] });
            toast.success('Application status updated');
        },
        onError: () => toast.error('Failed to update status'),
    });

    const isAgentOrLandlord = user?.role === 'AGENT' || user?.role === 'LANDLORD' || user?.role === 'ADMIN';

    if (isLoadingMy) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    const StatusBadge = ({ status }: { status: string }) => {
        const colors: Record<string, string> = {
            SUBMITTED: 'bg-blue-100 text-blue-800',
            SHORTLISTED: 'bg-yellow-100 text-yellow-800',
            APPROVED: 'bg-green-100 text-green-800',
            REJECTED: 'bg-red-100 text-red-800',
            CANCELLED: 'bg-gray-100 text-gray-800',
            REVIEWING: 'bg-purple-100 text-purple-800',
        };
        return <Badge className={colors[status] || 'bg-gray-100'}>{status}</Badge>;
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Applications</h1>
            </div>

            <Tabs defaultValue={isAgentOrLandlord ? "received" : "my"}>
                <TabsList>
                    {isAgentOrLandlord && <TabsTrigger value="received">Received</TabsTrigger>}
                    <TabsTrigger value="my">My Applications</TabsTrigger>
                </TabsList>

                {isAgentOrLandlord && (
                    <TabsContent value="received" className="space-y-4">
                        {isLoadingReceived ? <Loader2 className="animate-spin" /> : (
                            receivedApplications?.length === 0 ? (
                                <Card><CardContent className="pt-6 text-center text-muted-foreground">No received applications found.</CardContent></Card>
                            ) : (
                                receivedApplications?.map((app) => (
                                    <Card key={app.id}>
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <div className="space-y-1">
                                                <CardTitle className="text-base font-medium">
                                                    {app.user?.name} applied for <Link href={`/properties/${app.propertyId}`} className="underline">{app.property?.title}</Link>
                                                </CardTitle>
                                                <CardDescription>
                                                    Applied on {format(new Date(app.createdAt), 'PPP')}
                                                </CardDescription>
                                            </div>
                                            <StatusBadge status={app.status} />
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex justify-between items-center mt-4">
                                                <div className="text-sm text-gray-500">
                                                    Applicant: {app.user?.email} | {app.user?.phone}
                                                </div>
                                                <div className="space-x-2">
                                                    {app.status === 'SUBMITTED' && (
                                                        <>
                                                            <Button onClick={() => updateStatusMutation.mutate({ id: app.id, status: 'SHORTLISTED' })} variant="outline" size="sm">Shortlist</Button>
                                                            <Button onClick={() => updateStatusMutation.mutate({ id: app.id, status: 'REJECTED' })} variant="destructive" size="sm">Reject</Button>
                                                        </>
                                                    )}
                                                    {(app.status === 'SUBMITTED' || app.status === 'SHORTLISTED' || app.status === 'REVIEWING') && (
                                                        <Button onClick={() => updateStatusMutation.mutate({ id: app.id, status: 'APPROVED' })} variant="default" size="sm">Approve & Create Deal</Button>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )
                        )}
                    </TabsContent>
                )}

                <TabsContent value="my" className="space-y-4">
                    {myApplications?.length === 0 ? (
                        <Card><CardContent className="pt-6 text-center text-muted-foreground">You haven't applied to any properties yet.</CardContent></Card>
                    ) : (
                        myApplications?.map((app) => (
                            <Card key={app.id}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <div className="space-y-1">
                                        <CardTitle className="text-base font-medium">
                                            {app.property?.title}
                                        </CardTitle>
                                        <CardDescription>
                                            Applied on {format(new Date(app.createdAt), 'PPP')}
                                        </CardDescription>
                                    </div>
                                    <StatusBadge status={app.status} />
                                </CardHeader>
                                <CardContent>
                                    {/* Action buttons for applicant if needed (e.g. Cancel) */}
                                    {app.status === 'SUBMITTED' && (
                                        <Button onClick={() => updateStatusMutation.mutate({ id: app.id, status: 'CANCELLED' })} variant="ghost" size="sm" className="mt-2 text-red-500 hover:text-red-700">Cancel Application</Button>
                                    )}
                                </CardContent>
                            </Card>
                        ))
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
