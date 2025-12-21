'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Card, CardContent, Skeleton } from '@propad/ui';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';
import Link from 'next/link';
import { ShieldCheck, MapPin, Camera, FileText, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

export default function VerificationsPage() {
    const sdk = useAuthenticatedSDK();
    const { data: session } = useSession();

    const { data: properties, isLoading, error } = useQuery({
        queryKey: ['verifications:queue'],
        queryFn: async () => {
            if (!sdk || !session?.accessToken) throw new Error('SDK or session not available');
            // Call backend API directly - SDK doesn't have verifications.queue method yet
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

            if (!apiBaseUrl) {
                throw new Error('API configuration missing');
            }

            const response = await fetch(`${apiBaseUrl}/verifications/queue`, {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`
                }
            });
            if (!response.ok) throw new Error('Failed to fetch verifications');
            return response.json();
        },
        enabled: !!sdk && !!session?.accessToken,
        refetchInterval: 30000 // Refetch every 30 seconds
    });

    const getVerificationItemIcon = (type: string) => {
        switch (type) {
            case 'PROOF_OF_OWNERSHIP':
                return <FileText className="h-4 w-4" />;
            case 'LOCATION_CONFIRMATION':
                return <MapPin className="h-4 w-4" />;
            case 'PROPERTY_PHOTOS':
                return <Camera className="h-4 w-4" />;
            default:
                return <ShieldCheck className="h-4 w-4" />;
        }
    };

    const getVerificationItemLabel = (type: string) => {
        switch (type) {
            case 'PROOF_OF_OWNERSHIP':
                return 'Proof of Ownership';
            case 'LOCATION_CONFIRMATION':
                return 'Location';
            case 'PROPERTY_PHOTOS':
                return 'Photos';
            default:
                return type;
        }
    };

    const getStatusBadge = (status: string) => {
        const config: Record<string, { bg: string; text: string; label: string }> = {
            PENDING: { bg: 'bg-neutral-100', text: 'text-neutral-700', label: 'Pending' },
            SUBMITTED: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Submitted' },
            APPROVED: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Approved' },
            REJECTED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' }
        };
        const style = config[status] || config.PENDING;
        return (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}>
                {style.label}
            </span>
        );
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Verifications</h1>
                    <p className="text-sm text-neutral-500">Review and approve property verification requests.</p>
                </div>
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Verifications</h1>
                    <p className="text-sm text-neutral-500">Review and approve property verification requests.</p>
                </div>
                <Card>
                    <CardContent className="p-8 text-center">
                        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                        <p className="text-red-600">Failed to load verification queue</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const verificationRequests = properties || [];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Verifications</h1>
                <p className="text-sm text-neutral-500">Review and approve property verification requests.</p>
            </div>

            {verificationRequests.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center">
                        <ShieldCheck className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                        <p className="text-neutral-600">Verification queue is currently empty.</p>
                        <p className="mt-2 text-sm text-neutral-400">New verification requests will appear here.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {verificationRequests.map((property: any) => {
                        const verificationRequest = property.verificationRequests?.[0];
                        const items = verificationRequest?.items || [];
                        const pendingItems = items.filter((item: any) => item.status === 'PENDING' || item.status === 'SUBMITTED');
                        const owner = property.landlord || property.agentOwner;

                        return (
                            <Card key={property.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-semibold">{property.title}</h3>
                                                <span className="text-sm text-neutral-500">
                                                    {formatCurrency(Number(property.price), property.currency)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-neutral-600 mb-3">
                                                <span>Owner: {owner?.name || 'Unknown'}</span>
                                                {property.city?.name && (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" />
                                                        {property.city.name}
                                                        {property.suburb?.name && `, ${property.suburb.name}`}
                                                    </span>
                                                )}
                                            </div>
                                            {verificationRequest && (
                                                <div className="mt-4">
                                                    <p className="text-sm font-medium text-neutral-700 mb-2">Pending Items:</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {pendingItems.length > 0 ? (
                                                            pendingItems.map((item: any) => (
                                                                <div
                                                                    key={item.id}
                                                                    className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-md"
                                                                >
                                                                    {getVerificationItemIcon(item.type)}
                                                                    <span className="text-xs font-medium text-amber-800">
                                                                        {getVerificationItemLabel(item.type)}
                                                                    </span>
                                                                    {getStatusBadge(item.status)}
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <span className="text-sm text-neutral-500">All items reviewed</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="ml-4">
                                            <Link
                                                href={`/dashboard/admin/verifications/${verificationRequest.id}`}
                                                className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 transition-colors"
                                            >
                                                Review
                                            </Link>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
