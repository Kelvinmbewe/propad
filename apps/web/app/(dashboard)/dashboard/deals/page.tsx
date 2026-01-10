'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge } from '@propad/ui';
import { format } from 'date-fns';
import { Loader2, Calendar, DollarSign, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import type { Deal } from '@propad/sdk';

export default function DealsPage() {
    const sdk = useAuthenticatedSDK();

    const { data: deals, isLoading } = useQuery({
        queryKey: ['deals', 'my'],
        queryFn: () => sdk!.deals.my(),
        enabled: !!sdk,
    });

    if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    const StatusBadge = ({ status }: { status: string }) => {
        const colors: Record<string, string> = {
            ACTIVE: 'bg-green-100 text-green-800',
            COMPLETED: 'bg-blue-100 text-blue-800',
            TERMINATED: 'bg-red-100 text-red-800',
            CANCELLED: 'bg-gray-100 text-gray-800',
        };
        return <Badge className={colors[status] || 'bg-gray-100'}>{status}</Badge>;
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">My Deals</h1>
            </div>

            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                {deals?.length === 0 ? (
                    <Card><CardContent className="pt-6 text-center text-muted-foreground">No deals found.</CardContent></Card>
                ) : (
                    deals?.map((deal) => (
                        <Card key={deal.id}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <div className="space-y-1">
                                    <CardTitle className="text-lg font-medium">
                                        <Link href={`/properties/${deal.propertyId}`} className="hover:underline">{deal.property?.title}</Link>
                                    </CardTitle>
                                    <CardDescription>
                                        Deal #{deal.id.slice(-6)}
                                    </CardDescription>
                                </div>
                                <StatusBadge status={deal.status} />
                            </CardHeader>
                            <CardContent className="space-y-4 pt-4">
                                <div className="flex items-center space-x-2 text-sm">
                                    <Calendar className="h-4 w-4 text-gray-500" />
                                    <span>
                                        {format(new Date(deal.startDate), 'PPP')} - {deal.endDate ? format(new Date(deal.endDate), 'PPP') : 'Ongoing'}
                                    </span>
                                </div>
                                <div className="flex items-center space-x-2 text-sm">
                                    <DollarSign className="h-4 w-4 text-gray-500" />
                                    <span>
                                        {(deal.rentAmount / 100).toLocaleString('en-US', { style: 'currency', currency: deal.currency })} / month
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-2 border-t text-sm">
                                    <div>
                                        <span className="text-gray-500 block text-xs">Tenant</span>
                                        <div className="flex items-center space-x-1">
                                            <UserIcon className="h-3 w-3" />
                                            <span>{deal.tenant?.name || deal.tenantId}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block text-xs">Landlord</span>
                                        <div className="flex items-center space-x-1">
                                            <UserIcon className="h-3 w-3" />
                                            <span>{deal.landlord?.name || deal.landlordId}</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
