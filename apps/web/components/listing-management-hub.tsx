'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, CardHeader, CardTitle, notify, Skeleton, Input, Label } from '@propad/ui';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';
import { formatCurrency } from '@/lib/formatters';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

import { getInterestsForProperty, getChatThreads, getThreadMessages, sendMessage, getViewings } from '@/app/actions/listings';
import { acceptInterest, rejectInterest } from '@/app/actions/landlord';
import { getFeaturedStatus, createFeaturedListing, completeFeaturedPayment } from '@/app/actions/featured';
import { submitRating, getPropertyRatings } from '@/app/actions/ratings';
import { Check, X, MessageSquare, Send, Calendar, Clock, MapPin, ShieldCheck, AlertTriangle, Loader2, CreditCard, TrendingUp, Star, Upload, MapPin as MapPinIcon, Camera, FileText, Navigation } from 'lucide-react';

const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat('en-ZW', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric'
    }).format(new Date(date));
}

type Tab = 'overview' | 'management' | 'interest' | 'chats' | 'viewings' | 'payments' | 'verification' | 'ratings' | 'logs';

export function ListingManagementHub({ propertyId }: { propertyId: string }) {
    const sdk = useAuthenticatedSDK();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [serviceFee, setServiceFee] = useState('');
    const [selectedAgent, setSelectedAgent] = useState('');
    const [agentSearchQuery, setAgentSearchQuery] = useState('');
    const [agentSearchResults, setAgentSearchResults] = useState<any[]>([]);
    const [isSearchingAgents, setIsSearchingAgents] = useState(false);
    const [showAgentDropdown, setShowAgentDropdown] = useState(false);

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

    // Initialize selectedAgent and search query when property loads with existing agent
    useEffect(() => {
        if (property?.agentOwnerId && !selectedAgent) {
            setSelectedAgent(property.agentOwnerId);
            // Set search query to agent name if available
            const existingAgent = agents?.find((a: any) => a.id === property.agentOwnerId);
            if (existingAgent?.name) {
                setAgentSearchQuery(existingAgent.name);
            }
        }
    }, [property?.agentOwnerId, selectedAgent, agents]);

    // Debounced agent search
    useEffect(() => {
        if (!sdk || agentSearchQuery.length < 2) {
            setAgentSearchResults([]);
            setShowAgentDropdown(false);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearchingAgents(true);
            try {
                const results = await sdk.agents.search(agentSearchQuery);
                setAgentSearchResults(results);
                setShowAgentDropdown(true);
            } catch (error) {
                console.error('Agent search failed:', error);
                setAgentSearchResults([]);
            } finally {
                setIsSearchingAgents(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [agentSearchQuery, sdk]);

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
        { id: 'ratings', label: 'Ratings' },
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
                        agentSearchQuery={agentSearchQuery}
                        setAgentSearchQuery={setAgentSearchQuery}
                        agentSearchResults={agentSearchResults}
                        isSearchingAgents={isSearchingAgents}
                        showAgentDropdown={showAgentDropdown}
                        setShowAgentDropdown={setShowAgentDropdown}
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
                {activeTab === 'payments' && <PaymentsTab propertyId={propertyId} />}
                {activeTab === 'verification' && <VerificationTab propertyId={propertyId} />}
                {activeTab === 'ratings' && <RatingsTab propertyId={propertyId} />}
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
                    <p>{property.displayLocation || 'Location not specified'}</p>
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
    agentSearchQuery, setAgentSearchQuery, agentSearchResults, isSearchingAgents,
    showAgentDropdown, setShowAgentDropdown,
    serviceFee, setServiceFee, handleAssign, isAssigning,
    updateFee, isUpdatingFee
}: any) {
    const assignment = property.assignments?.[0];
    const selectedAgentData = agentSearchResults.find((a: any) => a.id === selectedAgent) || 
                              agents?.find((a: any) => a.id === selectedAgent);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const handleAgentSelect = (agent: any) => {
        setSelectedAgent(agent.id);
        setAgentSearchQuery(agent.name || '');
        setShowAgentDropdown(false);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowAgentDropdown(false);
            }
        };
        if (showAgentDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showAgentDropdown]);

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Agent Assignment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2 relative">
                        <Label>Search Agent</Label>
                        <div className="relative" ref={dropdownRef}>
                            <Input
                                type="text"
                                placeholder="Type agent name to search..."
                                value={agentSearchQuery}
                                onChange={(e) => {
                                    setAgentSearchQuery(e.target.value);
                                    if (e.target.value.length < 2) {
                                        setSelectedAgent('');
                                        setShowAgentDropdown(false);
                                    } else {
                                        setShowAgentDropdown(true);
                                    }
                                }}
                                onFocus={() => {
                                    if (agentSearchResults.length > 0) {
                                        setShowAgentDropdown(true);
                                    }
                                }}
                                disabled={!!assignment}
                                className="w-full"
                            />
                            {isSearchingAgents && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
                                </div>
                            )}
                            {showAgentDropdown && agentSearchResults.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-200 rounded-md shadow-lg max-h-60 overflow-auto">
                                    {agentSearchResults.map((agent: any) => (
                                        <div
                                            key={agent.id}
                                            onClick={() => handleAgentSelect(agent)}
                                            className="px-4 py-2 hover:bg-neutral-50 cursor-pointer border-b last:border-0"
                                        >
                                            <div className="font-medium">{agent.name || 'Unnamed Agent'}</div>
                                            <div className="text-xs text-neutral-500">
                                                {agent.agentProfile?.verifiedListingsCount || 0} verified listings
                                                {agent.agentProfile?.rating ? ` • Rating: ${agent.agentProfile.rating.toFixed(1)}` : ''}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {selectedAgentData && (
                            <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-md text-sm">
                                <span className="font-medium text-emerald-800">Selected: {selectedAgentData.name}</span>
                            </div>
                        )}
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

            <FeaturedSection propertyId={property.id} />
        </div>
    );
}

function FeaturedSection({ propertyId }: { propertyId: string }) {
    const { data: featured, refetch } = useQuery({
        queryKey: ['featured', propertyId],
        queryFn: () => getFeaturedStatus(propertyId)
    });

    const createMut = useMutation({
        mutationFn: () => createFeaturedListing(propertyId, 7, 1), // Default 7 days
        onSuccess: () => refetch()
    });

    const payMut = useMutation({
        mutationFn: (id: string) => completeFeaturedPayment(id),
        onSuccess: () => {
            notify.success('Payment successful! Listing is now featured.');
            refetch();
        }
    });

    const isActive = featured?.status === 'ACTIVE' && new Date(featured.endsAt) > new Date();

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                    Featured Listing
                </CardTitle>
            </CardHeader>
            <CardContent>
                {isActive ? (
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                        <p className="font-semibold text-purple-800">Your listing is featured!</p>
                        <p className="text-sm text-purple-600">Expires on {new Date(featured.endsAt).toLocaleDateString()}</p>
                    </div>
                ) : featured?.status === 'PENDING_PAYMENT' ? (
                    <div className="space-y-4">
                        <p className="text-sm text-neutral-600 mb-2">Payment pending for 7-day boost.</p>
                        <Button
                            variant="default"
                            className="w-full bg-purple-600 hover:bg-purple-700"
                            onClick={() => payMut.mutate(featured.id)}
                            disabled={payMut.isPending}
                        >
                            {payMut.isPending ? 'Processing...' : 'Pay $20 to Activate'}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-sm text-neutral-600">Boost your listing to get up to 3x more views.</p>
                        <Button
                            variant="outline"
                            className="w-full border-purple-200 text-purple-700 hover:bg-purple-50"
                            onClick={() => createMut.mutate()}
                            disabled={createMut.isPending}
                        >
                            {createMut.isPending ? 'Processing...' : 'Boost for 7 days ($20)'}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}


function InterestTab({ propertyId }: { propertyId: string }) {
    const { data: interests, isLoading, refetch } = useQuery({
        queryKey: ['interests', propertyId],
        queryFn: () => getInterestsForProperty(propertyId)
    });

    const handleAccept = async (id: string) => {
        try {
            const result = await acceptInterest(id);
            if (result.error) {
                notify.error(result.error);
            } else {
                notify.success('Offer accepted');
                refetch();
            }
        } catch (e) {
            notify.error('Failed to accept offer');
        }
    };

    const handleReject = async (id: string) => {
        try {
            const result = await rejectInterest(id);
            if (result.error) {
                notify.error(result.error);
            } else {
                notify.success('Offer rejected');
                refetch();
            }
        } catch (e) {
            notify.error('Failed to reject offer');
        }
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { bg: string; border: string; text: string; label: string }> = {
            PENDING: { bg: 'bg-neutral-100', border: 'border-neutral-200', text: 'text-neutral-600', label: 'Pending' },
            ACCEPTED: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', label: 'Accepted' },
            ON_HOLD: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', label: 'On Hold' },
            REJECTED: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', label: 'Rejected' },
            CONFIRMED: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', label: 'Confirmed' }
        };
        const config = statusConfig[status] || statusConfig.PENDING;
        return (
            <span className={`px-2 py-0.5 text-xs rounded-full border ${config.bg} ${config.border} ${config.text}`}>
                {config.label}
            </span>
        );
    };

    const getDaysUntilAutoConfirm = (updatedAt: Date | string) => {
        const updated = new Date(updatedAt);
        const daysSince = Math.floor((Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24));
        const daysRemaining = 30 - daysSince;
        return daysRemaining > 0 ? daysRemaining : 0;
    };

    if (isLoading) return <Skeleton className="h-64" />;
    if (!interests?.length) return <div className="p-8 text-center text-neutral-500">No interest requests yet.</div>;

    return (
        <div className="space-y-4">
            {interests.map((interest: any) => {
                const isActionable = interest.status === 'PENDING';
                const daysRemaining = interest.status === 'ACCEPTED' ? getDaysUntilAutoConfirm(interest.updatedAt) : null;

                return (
                    <Card key={interest.id} className="overflow-hidden">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-lg">{interest.user.name || 'Anonymous'}</span>
                                        {interest.user.isVerified && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">Verified</span>}
                                        {getStatusBadge(interest.status)}
                                    </div>
                                    <p className="text-sm text-neutral-500 mb-2">Expressed on {new Date(interest.createdAt).toLocaleDateString()}</p>

                                    {interest.offerAmount && (
                                        <p className="font-medium text-emerald-600 mb-2">
                                            Offer: {formatCurrency(Number(interest.offerAmount), 'USD')}
                                        </p>
                                    )}
                                    {interest.message && (
                                        <div className="bg-neutral-50 p-3 rounded text-sm text-neutral-700 italic mb-2">"{interest.message}"</div>
                                    )}
                                    {interest.status === 'ACCEPTED' && daysRemaining !== null && (
                                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                                            {daysRemaining > 0 
                                                ? `Auto-confirmation in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}` 
                                                : 'Auto-confirmation pending'}
                                        </div>
                                    )}
                                    {interest.status === 'ON_HOLD' && (
                                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                                            This offer is on hold because another offer was accepted.
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    {isActionable && (
                                        <>
                                            <Button size="sm" variant="outline" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => handleAccept(interest.id)}>
                                                <Check className="h-4 w-4 mr-1" /> Accept
                                            </Button>
                                            <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleReject(interest.id)}>
                                                <X className="h-4 w-4 mr-1" /> Reject
                                            </Button>
                                        </>
                                    )}
                                    {!isActionable && (
                                        <span className="text-xs text-neutral-400 italic">No actions available</span>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
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

function VerificationTab({ propertyId }: { propertyId: string }) {
    const { data: verification, isLoading, refetch } = useQuery({
        queryKey: ['verification', propertyId],
        queryFn: () => getPropertyVerification(propertyId)
    });

    const requestMut = useMutation({
        mutationFn: () => requestPropertyVerification(propertyId),
        onSuccess: () => {
            notify.success('Verification requested');
            refetch();
        }
    });

    if (isLoading) return <Skeleton className="h-64" />;

    const status = verification?.status || 'PENDING';
    const isApproved = status === 'APPROVED';
    const isPending = status === 'PENDING';
    const isRejected = status === 'REJECTED';

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className={`h-12 w-12 rounded-full flex items-center justify-center ${isApproved ? 'bg-emerald-100 text-emerald-600' :
                            isPending ? 'bg-yellow-100 text-yellow-600' :
                                'bg-red-100 text-red-600'
                            }`}>
                            {isApproved ? <ShieldCheck className="h-6 w-6" /> :
                                isPending ? <Loader2 className="h-6 w-6 animate-spin" /> :
                                    <AlertTriangle className="h-6 w-6" />
                            }
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold">
                                {isApproved ? 'Property Verified' :
                                    isPending ? 'Verification Pending' :
                                        'Verification Rejected'}
                            </h3>
                            <p className="text-sm text-neutral-500">
                                {isApproved ? 'This property has been verified by our team.' :
                                    isPending ? 'Our team is reviewing your documentation.' :
                                        isRejected ? 'Verification was rejected. Please submit new documentation.' :
                                            'Verify your property to increase trust and visibility.'}
                            </p>
                        </div>
                    </div>

                    {!verification && (
                        <div className="space-y-4">
                            <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
                                <h4 className="font-medium mb-2">Required for Verification:</h4>
                                <ul className="list-disc list-inside text-sm text-neutral-600 space-y-1">
                                    <li>Proof of Ownership (Title Deed or Utility Bill)</li>
                                    <li>Location Confirmation (On-site visit or Geo-tag)</li>
                                    <li>Valid Property Photos</li>
                                </ul>
                            </div>
                            <Button onClick={() => requestMut.mutate()} disabled={requestMut.isPending}>
                                {requestMut.isPending ? 'Requesting...' : 'Request Verification'}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}


function PaymentsTab({ propertyId }: { propertyId: string }) {
    const sdk = useAuthenticatedSDK();

    const { data: payments, isLoading, error } = useQuery({
        queryKey: ['payments', propertyId],
        queryFn: () => sdk!.properties.getPayments(propertyId),
        enabled: !!sdk
    });

    const getPaymentTitle = (type: string, metadata: any) => {
        switch (type) {
            case 'AGENT_FEE':
                return `Agent Service Fee${metadata?.agentName ? ` - ${metadata.agentName}` : ''}`;
            case 'FEATURED':
                return 'Featured Listing';
            case 'VERIFICATION':
                return 'Property Verification';
            case 'OTHER':
                return metadata?.description || 'Other Payment';
            default:
                return type;
        }
    };

    const getStatusBadge = (status: string) => {
        const config: Record<string, { bg: string; text: string; label: string }> = {
            PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
            PAID: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Paid' },
            FAILED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Failed' }
        };
        const style = config[status] || config.PENDING;
        return (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}>
                {style.label}
            </span>
        );
    };

    const handlePayNow = (payment: any) => {
        const redirectUrl = payment.invoice?.paymentIntents?.[0]?.redirectUrl;
        if (redirectUrl) {
            window.location.href = redirectUrl;
        } else {
            notify.error('Payment URL not available. Please contact support.');
        }
    };

    if (isLoading) return <Skeleton className="h-64" />;

    if (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load payments';
        if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
            return (
                <Card>
                    <CardContent className="p-8 text-center">
                        <AlertCircle className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                        <p className="text-neutral-600">You don't have permission to view payments for this listing.</p>
                    </CardContent>
                </Card>
            );
        }
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                    <p className="text-red-600">Failed to load payments: {errorMessage}</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Payment Ledger
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {!payments?.length ? (
                        <div className="text-center py-8">
                            <CreditCard className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                            <p className="text-neutral-500">No payments yet for this listing.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {payments.map((payment: any) => {
                                const isPending = payment.status === 'PENDING';
                                const canPay = isPending && payment.invoice?.paymentIntents?.[0]?.redirectUrl;
                                const amount = payment.amountCents / 100;
                                const formattedAmount = formatCurrency(amount, payment.currency as any);

                                return (
                                    <div
                                        key={payment.id}
                                        className="flex justify-between items-start p-4 border rounded-lg hover:bg-neutral-50 transition-colors"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="font-medium text-neutral-900">
                                                    {getPaymentTitle(payment.type, payment.metadata)}
                                                </p>
                                                {getStatusBadge(payment.status)}
                                            </div>
                                            <p className="text-xs text-neutral-500 mb-2">
                                                {new Date(payment.createdAt).toLocaleDateString('en-ZW', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: 'numeric',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                            {payment.reference && (
                                                <p className="text-xs text-neutral-400">Ref: {payment.reference}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 ml-4">
                                            <div className="text-right">
                                                <p className="font-bold text-lg text-neutral-900">{formattedAmount}</p>
                                            </div>
                                            {canPay && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handlePayNow(payment)}
                                                    className="bg-emerald-600 hover:bg-emerald-700"
                                                >
                                                    Pay Now
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function RatingsTab({ propertyId }: { propertyId: string }) {
    const { data: ratings, isLoading, refetch } = useQuery({
        queryKey: ['ratings', propertyId],
        queryFn: () => getPropertyRatings(propertyId)
    });

    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');

    const submitMut = useMutation({
        mutationFn: () => submitRating('target-user-id-placeholder', propertyId, rating, comment), // In real app, target correct user (landlord/tenant)
        onSuccess: () => {
            notify.success('Rating submitted');
            setRating(0);
            setComment('');
            refetch();
        }
    });

    if (isLoading) return <Skeleton className="h-64" />;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Ratings & Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="mb-6 p-4 bg-neutral-50 rounded-lg">
                        <h4 className="font-medium mb-2">Leave a Rating</h4>
                        <div className="flex gap-2 mb-4">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    className={`h-6 w-6 cursor-pointer ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-neutral-300'}`}
                                    onClick={() => setRating(star)}
                                />
                            ))}
                        </div>
                        <textarea
                            className="w-full p-2 border rounded mb-2"
                            placeholder="Share your experience..."
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                        />
                        <Button onClick={() => submitMut.mutate()} disabled={submitMut.isPending || rating === 0}>
                            Submit Review
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {ratings?.map((r: any) => (
                            <div key={r.id} className="border-b pb-4 last:border-0">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 bg-neutral-200 rounded-full flex items-center justify-center font-bold text-xs">
                                            {r.reviewer.name?.[0]}
                                        </div>
                                        <span className="font-semibold">{r.reviewer.name}</span>
                                    </div>
                                    <div className="flex">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} className={`h-4 w-4 ${i < r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-neutral-300'}`} />
                                        ))}
                                    </div>
                                </div>
                                <p className="text-neutral-600">{r.comment}</p>
                            </div>
                        ))}
                    </div>
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
