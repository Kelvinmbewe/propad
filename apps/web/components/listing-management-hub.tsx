'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, CardHeader, CardTitle, notify, Skeleton, Input, Label } from '@propad/ui';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';
import { formatCurrency } from '@/lib/formatters';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

type Tab = 'overview' | 'management' | 'interest' | 'chats' | 'viewings' | 'payments' | 'verification' | 'logs';

export function ListingManagementHub({ propertyId }: { propertyId: string }) {
    const sdk = useAuthenticatedSDK();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [serviceFee, setServiceFee] = useState('');
    const [selectedAgent, setSelectedAgent] = useState('');

    const { data: property, isLoading, error } = useQuery({
        queryKey: ['property', propertyId],
        queryFn: () => sdk!.properties.get(propertyId),
        enabled: !!sdk
    });

    const { data: agents } = useQuery({
        queryKey: ['agents:verified'],
        queryFn: () => sdk!.agents.listVerified(),
        enabled: !!sdk
    });

    const assignMutation = useMutation({
        mutationFn: ({ agentId, serviceFeeUsd }: { agentId: string; serviceFeeUsd?: number }) =>
            sdk!.properties.assignAgent(propertyId, { agentId, serviceFeeUsd }),
        onSuccess: () => {
            notify.success('Agent assigned successfully');
            queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
            setServiceFee('');
        },
        onError: (err: any) => notify.error(err.message || 'Failed to assign agent')
    });

    const updateFeeMutation = useMutation({
        mutationFn: ({ serviceFeeUsd }: { serviceFeeUsd: number }) =>
            sdk!.properties.updateServiceFee(propertyId, { serviceFeeUsd }),
        onSuccess: () => {
            notify.success('Service fee updated');
            queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
        },
        onError: (err: any) => notify.error(err.message || 'Failed to update fee')
    });

    const handleAssign = () => {
        if (!selectedAgent) return notify.error('Select an agent first');
        const fee = serviceFee ? Number(serviceFee) : undefined;
        assignMutation.mutate({ agentId: selectedAgent, serviceFeeUsd: fee });
    };

    if (isLoading) return <Skeleton className="h-96 w-full" />;
    if (error || !property) return <div className="text-red-500">Failed to load property</div>;

    const tabs: { id: Tab; label: string }[] = [
        { id: 'overview', label: 'Overview' },
        { id: 'management', label: 'Management' },
        { id: 'interest', label: 'Interest' },
        { id: 'chats', label: 'Chats' },
        { id: 'viewings', label: 'Viewings' },
        { id: 'payments', label: 'Payments' },
        { id: 'verification', label: 'Verification' },
        { id: 'logs', label: 'Logs' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/listings">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold">{property.title}</h1>
            </div>

            <div className="flex border-b overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.id
                                ? 'border-emerald-600 text-emerald-600'
                                : 'border-transparent text-neutral-500 hover:text-neutral-700'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="min-h-[400px]">
                {activeTab === 'overview' && (
                    <OverviewTab property={property} />
                )}
                {activeTab === 'management' && (
                    <ManagementTab
                        property={property}
                        agents={agents}
                        selectedAgent={selectedAgent}
                        setSelectedAgent={setSelectedAgent}
                        serviceFee={serviceFee}
                        setServiceFee={setServiceFee}
                        handleAssign={handleAssign}
                        isAssigning={assignMutation.isPending}
                        updateFee={updateFeeMutation.mutate}
                        isUpdatingFee={updateFeeMutation.isPending}
                    />
                )}
                {activeTab === 'interest' && (
                    <PlaceholderTab title="Interest & Offers" />
                    // TODO: Reuse existing Interest module
                )}
                {activeTab === 'chats' && <PlaceholderTab title="Chats" />}
                {activeTab === 'viewings' && <PlaceholderTab title="Viewings" />}
                {activeTab === 'payments' && <PlaceholderTab title="Payments" />}
                {activeTab === 'verification' && <PlaceholderTab title="Verification" />}
                {activeTab === 'logs' && <PlaceholderTab title="Logs" />}
            </div>
        </div>
    );
}

function OverviewTab({ property }: { property: any }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
                <div>
                    <p className="text-sm font-medium text-neutral-500">Price</p>
                    <p className="text-lg font-bold text-emerald-600">
                        {formatCurrency(Number(property.price), property.currency)}
                    </p>
                </div>
                <div>
                    <p className="text-sm font-medium text-neutral-500">Location</p>
                    <p>{[property.suburb?.name, property.city?.name].filter(Boolean).join(', ')}</p>
                </div>
                <div>
                    <p className="text-sm font-medium text-neutral-500">Status</p>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800">
                        {property.status}
                    </span>
                </div>
                <div>
                    <p className="text-sm font-medium text-neutral-500">Listed On</p>
                    <p>{new Date(property.createdAt).toLocaleDateString()}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function ManagementTab({
    property, agents, selectedAgent, setSelectedAgent,
    serviceFee, setServiceFee, handleAssign, isAssigning,
    updateFee, isUpdatingFee
}: any) {
    const assignment = property.assignments?.[0];

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Agent Assignment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Select Agent</Label>
                        <select
                            className="w-full p-2 border rounded-md"
                            value={selectedAgent || property.agentOwnerId || ''}
                            onChange={(e) => setSelectedAgent(e.target.value)}
                            disabled={!!assignment}
                        >
                            <option value="">Select Agent...</option>
                            {agents?.map((a: any) => (
                                <option key={a.id} value={a.id}>{a.name} ({a.agentProfile?.verifiedListingsCount} verified)</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <Label>Service Fee (USD)</Label>
                        <Input
                            type="number"
                            placeholder="e.g. 50"
                            value={serviceFee || (assignment?.serviceFeeUsdCents ? assignment.serviceFeeUsdCents / 100 : '')}
                            onChange={(e) => setServiceFee(e.target.value)}
                        />
                    </div>

                    <Button
                        onClick={assignment ? () => updateFee({ serviceFeeUsd: Number(serviceFee) }) : handleAssign}
                        disabled={isAssigning || isUpdatingFee}
                    >
                        {assignment ? 'Update Fee' : 'Assign Agent'}
                    </Button>

                    {assignment && (
                        <div className="mt-4 p-4 bg-blue-50 text-blue-800 rounded-md text-sm flex items-start gap-2">
                            <CheckCircle2 className="h-5 w-5 shrink-0" />
                            <div>
                                <p className="font-semibold">Assigned to {property.agentOwner?.name}</p>
                                <p>Service Fee: ${assignment.serviceFeeUsdCents / 100}</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function PlaceholderTab({ title }: { title: string }) {
    return (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg text-neutral-500">
            <AlertCircle className="h-8 w-8 mb-2" />
            <p>Module: {title}</p>
            <p className="text-xs">Coming soon</p>
        </div>
    );
}
