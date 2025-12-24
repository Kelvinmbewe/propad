'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Card, CardContent, Skeleton } from '@propad/ui';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';
import Link from 'next/link';
import { ShieldCheck, MapPin, Camera, FileText, AlertCircle, User, Building } from 'lucide-react';
import { format } from 'date-fns';

export default function VerificationsPage() {
    const sdk = useAuthenticatedSDK();
    const { data: session } = useSession();

    const { data: queue, isLoading, error } = useQuery({
        queryKey: ['verifications:queue'],
        queryFn: async () => {
            if (!sdk) throw new Error('SDK not available');
            return sdk.admin.verifications.listQueue();
        },
        enabled: !!sdk,
        refetchInterval: 30000
    });

    const getTargetIcon = (type: string) => {
        switch (type) {
            case 'PROPERTY': return <MapPin className="h-4 w-4" />;
            case 'USER': return <User className="h-4 w-4" />;
            case 'COMPANY': return <Building className="h-4 w-4" />;
            default: return <ShieldCheck className="h-4 w-4" />;
        }
    };

    const getStatusBadge = (status: string) => {
        const config: Record<string, { bg: string; text: string; label: string }> = {
            PENDING: { bg: 'bg-neutral-100', text: 'text-neutral-700', label: 'Pending' },
            SUBMITTED: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Submitted' },
            APPROVED: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Approved' },
            REJECTED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
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
                    <p className="text-sm text-neutral-500">Review and approve verification requests.</p>
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
                    <p className="text-sm text-neutral-500">Review and approve verification requests.</p>
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

    const verificationRequests = queue || [];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Verifications</h1>
                <p className="text-sm text-neutral-500">Review and approve verification requests.</p>
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
                    {verificationRequests.map((item) => (
                        <Card key={item.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-neutral-100 rounded-lg text-neutral-600">
                                                {getTargetIcon(item.targetType)}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold">{item.targetLabel}</h3>
                                                <div className="flex items-center gap-2 text-sm text-neutral-500">
                                                    <span>{item.requesterName}</span>
                                                    <span>•</span>
                                                    <span>{format(new Date(item.createdAt), 'MMM d, yyyy')}</span>
                                                </div>
                                            </div>

                                            {item.isPaid && (
                                                <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-bold shadow-sm">
                                                    PAID
                                                </span>
                                            )}

                                            {getStatusBadge(item.status)}
                                        </div>

                                        <div className="flex items-center gap-4 text-sm text-neutral-600 mt-3 pl-12">
                                            <span className="flex items-center gap-1 bg-neutral-50 px-2 py-1 rounded">
                                                <ShieldCheck className="h-3 w-3" />
                                                {item.itemsCount} Items
                                            </span>
                                            <span className="text-xs text-neutral-400 font-mono">
                                                ID: {item.targetId.substring(0, 8)}...
                                            </span>
                                        </div>
                                    </div>
                                    <div className="ml-4 flex items-center h-full">
                                        <Link
                                            href={`/dashboard/admin/verifications/${item.id}`}
                                            className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 transition-colors"
                                        >
                                            Review
                                        </Link>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
