'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, CardHeader, CardTitle, notify, Skeleton, Input, Label } from '@propad/ui';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';
import { formatCurrency } from '@/lib/formatters';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

import { getInterestsForProperty, updateInterestStatus, getChatThreads, getThreadMessages, sendMessage, getViewings } from '@/app/actions/listings';
import { Check, X, MessageSquare, Send, Calendar, Clock, MapPin } from 'lucide-react';

const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat('en-ZW', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric'
    }).format(new Date(date));
}

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
                    <InterestTab propertyId={propertyId} />
                )}
                {activeTab === 'chats' && (
                    <ChatsTab propertyId={propertyId} />
                )}
                {activeTab === 'viewings' && <ViewingsTab propertyId={propertyId} />}
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


function InterestTab({ propertyId }: { propertyId: string }) {
    const { data: interests, isLoading, refetch } = useQuery({
        queryKey: ['interests', propertyId],
        queryFn: () => getInterestsForProperty(propertyId)
    });

    const handleStatus = async (id: string, status: 'ACCEPTED' | 'REJECTED') => {
        try {
            await updateInterestStatus(id, status);
            notify.success(`Interest ${status.toLowerCase()}`);
            refetch();
        } catch (e) {
            notify.error('Failed to update status');
        }
    };

    if (isLoading) return <Skeleton className="h-64" />;
    if (!interests?.length) return <div className="p-8 text-center text-neutral-500">No interest requests yet.</div>;

    return (
        <div className="space-y-4">
            {interests.map((interest: any) => (
                <Card key={interest.id} className="overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-lg">{interest.user.name || 'Anonymous'}</span>
                                    {interest.user.isVerified && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">Verified</span>}
                                    <span className={`px-2 py-0.5 text-xs rounded-full border ${interest.status === 'ACCEPTED' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                                        interest.status === 'REJECTED' ? 'bg-red-50 border-red-200 text-red-700' :
                                            'bg-neutral-100 border-neutral-200 text-neutral-600'
                                        }`}>{interest.status}</span>
                                </div>
                                <p className="text-sm text-neutral-500 mb-2">Expressed on {new Date(interest.createdAt).toLocaleDateString()}</p>

                                {interest.offerAmount && (
                                    <p className="font-medium text-emerald-600 mb-2">
                                        Offer: {formatCurrency(Number(interest.offerAmount), 'USD')}
                                    </p>
                                )}
                                {interest.message && (
                                    <div className="bg-neutral-50 p-3 rounded text-sm text-neutral-700 italic">"{interest.message}"</div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                {interest.status === 'PENDING' && (
                                    <>
                                        <Button size="sm" variant="outline" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => handleStatus(interest.id, 'ACCEPTED')}>
                                            <Check className="h-4 w-4 mr-1" /> Accept
                                        </Button>
                                        <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleStatus(interest.id, 'REJECTED')}>
                                            <X className="h-4 w-4 mr-1" /> Reject
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

function ChatsTab({ propertyId }: { propertyId: string }) {
    const [selectedThread, setSelectedThread] = useState<string | null>(null);

    // List threads
    const { data: threads, isLoading: threadsLoading } = useQuery({
        queryKey: ['chat-threads', propertyId],
        queryFn: () => getChatThreads(propertyId),
        refetchInterval: 10000
    });

    if (threadsLoading) return <Skeleton className="h-96" />;

    if (selectedThread) {
        return <ChatThreadView propertyId={propertyId} userId={selectedThread} onBack={() => setSelectedThread(null)} />;
    }

    if (!threads?.length) return <div className="p-8 text-center text-neutral-500">No active chats.</div>;

    return (
        <div className="space-y-2">
            {threads.map((thread: any) => (
                <div
                    key={thread.user.id}
                    className="flex items-center p-4 border rounded-lg hover:bg-neutral-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedThread(thread.user.id)}
                >
                    <div className="h-10 w-10 bg-neutral-200 rounded-full flex items-center justify-center text-neutral-500 font-bold mr-3">
                        {thread.user.name?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold truncate">{thread.user.name || 'Anonymous'}</span>
                            <span className="text-xs text-neutral-400">{formatDate(thread.lastMessage.createdAt)}</span>
                        </div>
                        <p className="text-sm text-neutral-600 truncate">{thread.lastMessage.body}</p>
                    </div>
                    {thread.unreadCount > 0 && (
                        <span className="ml-2 h-5 w-5 bg-red-500 text-white text-xs flex items-center justify-center rounded-full">
                            {thread.unreadCount}
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
}

function ChatThreadView({ propertyId, userId, onBack }: { propertyId: string, userId: string, onBack: () => void }) {
    const [text, setText] = useState('');
    const queryClient = useQueryClient();

    const { data: messages, isLoading } = useQuery({
        queryKey: ['chat-messages', propertyId, userId],
        queryFn: () => getThreadMessages(propertyId, userId),
        refetchInterval: 5000
    });

    const sendMut = useMutation({
        mutationFn: (body: string) => sendMessage(propertyId, userId, body),
        onSuccess: () => {
            setText('');
            queryClient.invalidateQueries({ queryKey: ['chat-messages', propertyId, userId] });
        }
    });

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim()) return;
        sendMut.mutate(text);
    }

    if (isLoading) return <Skeleton className="h-96" />;

    return (
        <div className="h-[600px] flex flex-col border rounded-lg">
            <div className="p-3 border-b flex items-center gap-2 bg-neutral-50">
                <Button variant="ghost" size="sm" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <span className="font-semibold">Chat</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages?.map((msg: any) => {
                    const isMe = msg.senderId !== userId; // userId is the counterparty
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-lg p-3 ${isMe ? 'bg-emerald-600 text-white' : 'bg-neutral-100 text-neutral-800'
                                }`}>
                                <p className="text-sm">{msg.body}</p>
                                <p className={`text-[10px] mt-1 ${isMe ? 'text-emerald-100' : 'text-neutral-400'}`}>
                                    {formatDate(msg.createdAt)}
                                </p>
                            </div>
                        </div>
                    )
                })}
            </div>
            <form onSubmit={handleSend} className="p-3 border-t flex gap-2">
                <Input value={text} onChange={e => setText(e.target.value)} placeholder="Type a message..." disabled={sendMut.isPending} />
                <Button type="submit" size="icon" disabled={sendMut.isPending}>
                    <Send className="h-4 w-4" />
                </Button>
            </form>
        </div>
    )
}

function ViewingsTab({ propertyId }: { propertyId: string }) {
    const { data: viewings, isLoading } = useQuery({
        queryKey: ['viewings', propertyId],
        queryFn: () => getViewings(propertyId)
    });

    if (isLoading) return <Skeleton className="h-64" />;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg">
                <div className="flex gap-2 items-center text-blue-800">
                    <Calendar className="h-5 w-5" />
                    <span className="font-medium">Schedule Viewing</span>
                </div>
                {/* Simplified sharing flow */}
                <Button size="sm" variant="outline">Share Availability</Button>
            </div>

            {!viewings?.length ? (
                <div className="p-8 text-center text-neutral-500">No upcoming viewings scheduled.</div>
            ) : (
                viewings.map((v: any) => (
                    <Card key={v.id}>
                        <CardContent className="p-4 flex justify-between items-center">
                            <div className="flex gap-3">
                                <div className="bg-neutral-100 p-2 rounded-lg flex flex-col items-center justify-center min-w-[60px]">
                                    <span className="text-xs text-neutral-500">{new Date(v.scheduledAt).toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</span>
                                    <span className="text-xl font-bold">{new Date(v.scheduledAt).getDate()}</span>
                                </div>
                                <div>
                                    <h4 className="font-semibold">{v.viewer.name}</h4>
                                    <div className="flex items-center gap-2 text-sm text-neutral-500">
                                        <Clock className="h-3 w-3" />
                                        <span>{formatDate(v.scheduledAt)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-neutral-500">
                                        <MapPin className="h-3 w-3" />
                                        <span>On-site</span>
                                    </div>
                                </div>
                            </div>
                            <span className="px-3 py-1 bg-neutral-100 rounded-full text-xs font-medium">
                                {v.status}
                            </span>
                        </CardContent>
                    </Card>
                ))
            )}
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
