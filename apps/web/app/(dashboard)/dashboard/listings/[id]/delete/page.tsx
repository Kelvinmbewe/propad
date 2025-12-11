'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, notify } from '@propad/ui';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';

export default function DeletePropertyPage() {
    const router = useRouter();
    const params = useParams();
    const propertyId = params.id as string;
    const sdk = useAuthenticatedSDK();
    const queryClient = useQueryClient();
    const [isDeleting, setIsDeleting] = useState(false);

    const { data: property, isLoading: loadingProperty, isError } = useQuery({
        queryKey: ['property', propertyId],
        queryFn: () => sdk!.properties.get(propertyId),
        enabled: !!sdk && !!propertyId,
    });

    const deleteMutation = useMutation({
        mutationFn: () => sdk!.properties.delete(propertyId),
        onSuccess: () => {
            notify.success('Property deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['properties:owned'] });
            router.push('/dashboard/listings');
        },
        onError: (error: unknown) => {
            const fallback = 'Failed to delete property';
            if (error instanceof Error) {
                notify.error(error.message || fallback);
            } else {
                notify.error(fallback);
            }
            setIsDeleting(false);
        }
    });

    const handleDelete = async () => {
        setIsDeleting(true);
        deleteMutation.mutate();
    };

    if (!sdk || loadingProperty) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                <span className="ml-2 text-slate-600">Loading property...</span>
            </div>
        );
    }

    if (isError || !property) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <p className="text-red-600">Property not found or you don't have access.</p>
                <Button onClick={() => router.push('/dashboard/listings')} className="mt-4">
                    Back to Listings
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto py-12 px-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 text-center">
                <div className="flex justify-center mb-6">
                    <div className="rounded-full bg-red-100 p-4">
                        <AlertTriangle className="h-12 w-12 text-red-600" />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-4">
                    Delete Property
                </h1>

                <p className="text-slate-600 dark:text-slate-400 mb-2">
                    Are you sure you want to delete this property?
                </p>

                <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4 my-6">
                    <h2 className="font-semibold text-slate-900 dark:text-slate-50">
                        {property.title}
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        {(property as any).suburbName || (property as any).cityName || 'Location not specified'}
                    </p>
                </div>

                <p className="text-sm text-red-600 font-medium mb-6">
                    This action cannot be undone. All associated data including images, messages, and leads will be permanently deleted.
                </p>

                <div className="flex gap-4">
                    <Button
                        variant="outline"
                        onClick={() => router.push('/dashboard/listings')}
                        className="flex-1"
                        disabled={isDeleting}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="flex-1"
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            'Delete Property'
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
