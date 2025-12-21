'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, Button, Label, notify } from '@propad/ui';
import { ChevronLeft, Check, X, FileText, Download, ExternalLink, MapPin, Camera, AlertTriangle } from 'lucide-react';


export default function VerificationReviewPage() {
    const params = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const queryClient = useQueryClient();
    const [rejectionNotes, setRejectionNotes] = useState<Record<string, string>>({});
    const [activeRejection, setActiveRejection] = useState<string | null>(null);

    const { data: request, isLoading } = useQuery({
        queryKey: ['verification-request', params.id],
        queryFn: async () => {
            if (!session?.accessToken) throw new Error('No session');
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
            const res = await fetch(`${apiBaseUrl}/verifications/${params.id}`, {
                headers: { Authorization: `Bearer ${session.accessToken}` }
            });
            if (!res.ok) throw new Error('Failed to load request');
            return res.json();
        },
        enabled: !!session?.accessToken
    });

    const reviewMutation = useMutation({
        mutationFn: async ({ itemId, status, notes }: { itemId: string, status: string, notes?: string }) => {
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
            const res = await fetch(`${apiBaseUrl}/verifications/${params.id}/items/${itemId}/review`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${session?.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status, notes })
            });
            if (!res.ok) throw new Error('Failed to review item');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['verification-request', params.id] });
            notify.success('Item updated');
            setActiveRejection(null);
        },
        onError: () => notify.error('Failed to update item')
    });

    if (isLoading) return <div className="p-8">Loading verification request...</div>;
    if (!request) return <div className="p-8">Request not found</div>;

    const property = request.property;

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/verifications" className="p-2 hover:bg-neutral-100 rounded-full">
                    <ChevronLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">Verification Review</h1>
                    <p className="text-sm text-neutral-500">Request ID: {request.id}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Property Context */}
                <Card className="md:col-span-1 h-fit">
                    <CardContent className="p-6 space-y-4">
                        <h3 className="font-semibold text-lg">Property Details</h3>
                        <div>
                            <p className="text-sm font-medium text-neutral-500">Title</p>
                            <p className="truncate">{property.title}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-neutral-500">Address</p>
                            <p className="text-sm">
                                {property.suburbId ? 'Suburb ID: ' + property.suburbId : 'Pending Location'}
                                <br />
                                {property.cityId ? 'City ID: ' + property.cityId : ''}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-neutral-500">Owner</p>
                            <p>{property.landlord?.name || property.agentOwner?.name || 'Unknown'}</p>
                        </div>
                        <div className="pt-4">
                            <Link
                                href={`/dashboard/listings/${property.id}`}
                                target="_blank"
                                className="text-emerald-600 hover:underline text-sm flex items-center gap-1"
                            >
                                View Listing <ExternalLink className="h-3 w-3" />
                            </Link>
                        </div>
                    </CardContent>
                </Card>

                {/* Verification Items */}
                <div className="md:col-span-2 space-y-4">
                    <h3 className="font-semibold text-lg">Verification Items</h3>

                    {request.items.map((item: any) => (
                        <Card key={item.id} className={`border-l-4 ${item.status === 'APPROVED' ? 'border-l-emerald-500' :
                            item.status === 'REJECTED' ? 'border-l-red-500' : 'border-l-amber-500'
                            }`}>
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2">
                                        {item.type === 'PROOF_OF_OWNERSHIP' && <FileText className="h-5 w-5 text-blue-500" />}
                                        {item.type === 'LOCATION_CONFIRMATION' && <MapPin className="h-5 w-5 text-red-500" />}
                                        {item.type === 'PROPERTY_PHOTOS' && <Camera className="h-5 w-5 text-purple-500" />}
                                        <h4 className="font-semibold">{item.type.replace(/_/g, ' ')}</h4>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${item.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                                        item.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                            'bg-amber-100 text-amber-700'
                                        }`}>
                                        {item.status}
                                    </span>
                                </div>

                                {/* Evidence Display */}
                                <div className="mb-6 bg-neutral-50 p-4 rounded-md">
                                    <p className="text-xs font-semibold text-neutral-500 uppercase mb-2">Evidence</p>
                                    {item.evidenceUrls && item.evidenceUrls.length > 0 ? (
                                        <div className="space-y-2">
                                            {item.evidenceUrls.map((url: string, idx: number) => {
                                                const isDoc = url.toLowerCase().endsWith('.pdf') ||
                                                    url.toLowerCase().endsWith('.doc') ||
                                                    url.toLowerCase().endsWith('.docx');
                                                return (
                                                    <div key={idx} className="flex items-center gap-3 p-2 bg-white border rounded">
                                                        {isDoc ? (
                                                            <FileText className="h-8 w-8 text-neutral-400" />
                                                        ) : (
                                                            <img src={url} alt="Evidence" className="h-16 w-16 object-cover rounded" />
                                                        )}
                                                        <div className="flex-1 overflow-hidden">
                                                            <p className="text-sm truncate">{url.split('/').pop()}</p>
                                                        </div>
                                                        <a
                                                            href={url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-2 hover:bg-neutral-100 rounded text-neutral-600"
                                                            title="Download / View"
                                                        >
                                                            <Download className="h-4 w-4" />
                                                        </a>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-neutral-400 italic">No evidence uploaded</p>
                                    )}
                                </div>

                                {/* Rejection Details if Rejected */}
                                {item.status === 'REJECTED' && item.rejectionReason && (
                                    <div className="mb-4 p-3 bg-red-50 text-red-800 text-sm rounded border border-red-100">
                                        <strong>Rejection Reason:</strong> {item.rejectionReason}
                                    </div>
                                )}

                                {/* Action Buttons */}
                                {item.status === 'PENDING' && (
                                    <div className="flex gap-3 justify-end items-end">
                                        {activeRejection === item.id ? (
                                            <div className="w-full space-y-2 animate-in fade-in slide-in-from-top-1">
                                                <Label>Reason for Rejection</Label>
                                                <textarea
                                                    className="w-full p-2 border rounded-md text-sm"
                                                    rows={2}
                                                    placeholder="Required..."
                                                    value={rejectionNotes[item.id] || ''}
                                                    onChange={e => setRejectionNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                />
                                                <div className="flex gap-2 justify-end">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setActiveRejection(null)}
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        disabled={!rejectionNotes[item.id]}
                                                        onClick={() => reviewMutation.mutate({
                                                            itemId: item.id,
                                                            status: 'REJECTED',
                                                            notes: rejectionNotes[item.id]
                                                        })}
                                                    >
                                                        Confirm Rejection
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                                                    onClick={() => setActiveRejection(item.id)}
                                                >
                                                    <X className="h-4 w-4 mr-2" />
                                                    Reject
                                                </Button>
                                                <Button
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                                    onClick={() => reviewMutation.mutate({ itemId: item.id, status: 'APPROVED' })}
                                                >
                                                    <Check className="h-4 w-4 mr-2" />
                                                    Approve
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}

                    {request.items.length === 0 && (
                        <div className="text-center p-8 text-neutral-500 bg-neutral-50 rounded-lg border border-dashed">
                            No verification items found for this request.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
