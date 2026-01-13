'use client';
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
                        <Card key={item.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-emerald-500">
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 space-y-3">
                                        {/* Header Row */}
                                        <div className="flex items-start gap-4">
                                            <div className="p-3 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg text-emerald-700 shadow-sm">
                                                {getTargetIcon(item.targetType)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-3 mb-2">
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-lg font-semibold text-neutral-900 truncate">
                                                            {item.targetLabel}
                                                        </h3>
                                                        <div className="flex items-center gap-2 text-sm text-neutral-500 mt-1">
                                                            <span className="flex items-center gap-1">
                                                                <User className="h-3.5 w-3.5" />
                                                                {item.requesterName}
                                                            </span>
                                                            <span>•</span>
                                                            <span className="flex items-center gap-1">
                                                                <span>{format(new Date(item.createdAt), 'MMM d, yyyy')}</span>
                                                                <span className="text-xs">at {format(new Date(item.createdAt), 'h:mm a')}</span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        {item.isPaid && (
                                                            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-bold shadow-sm border border-emerald-200">
                                                                PAID
                                                            </span>
                                                        )}
                                                        {getStatusBadge(item.status)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Details Row */}
                                        <div className="flex items-center gap-4 text-sm text-neutral-600 pl-14">
                                            <span className="flex items-center gap-1.5 bg-neutral-50 px-3 py-1.5 rounded-md border border-neutral-200">
                                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                                                <span className="font-medium">{item.itemsCount}</span>
                                                <span className="text-neutral-500">verification{item.itemsCount !== 1 ? 's' : ''}</span>
                                            </span>
                                            <span className="text-xs text-neutral-400 font-mono bg-neutral-50 px-2 py-1 rounded border border-neutral-200">
                                                ID: {item.targetId.substring(0, 8)}...
                                            </span>
                                            {item.targetType === 'PROPERTY' && (
                                                <span className="text-xs text-neutral-500 flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" />
                                                    Property verification
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center h-full flex-shrink-0">
                                        <Link
                                            href={`/dashboard/admin/verifications/${item.id}`}
                                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm hover:shadow-md"
                                        >
                                            <ShieldCheck className="h-4 w-4" />
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
