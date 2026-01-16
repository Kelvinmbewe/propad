"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  notify,
  Skeleton,
  Input,
  Label,
  Textarea,
} from "@propad/ui";
import { ChargeableItemType } from "@propad/config";
import { useAuthenticatedSDK } from "@/hooks/use-authenticated-sdk";
import { formatCurrency } from "@/lib/formatters";
import Link from "next/link";

import type { PropertyInterest, PropertyViewing } from "@/app/actions/listings";
import {
  getInterestsForProperty,
  getChatThreads,
  getThreadMessages,
  sendMessage,
  getViewings,
} from "@/app/actions/listings";
import { acceptInterest, rejectInterest } from "@/app/actions/landlord";
import { PaymentGate } from "@/components/payment-gate";
import {
  ArrowLeft,
  Check,
  X,
  MessageSquare,
  Send,
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  CreditCard,
  TrendingUp,
  Star,
  MapPin as MapPinIcon,
  Camera,
  FileText,
  Navigation,
  UserCheck,
  UserX,
  Eye,
  Handshake,
  DollarSign,
  CheckCircle2,
  XCircle,
  History,
  AlertCircle,
  Info,
} from "lucide-react";

const formatDate = (date: Date | string) => {
  return new Intl.DateTimeFormat("en-ZW", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).format(new Date(date));
};

type Tab =
  | "overview"
  | "management"
  | "interest"
  | "chats"
  | "viewings"
  | "payments"
  | "verification"
  | "ratings"
  | "logs";

export function ListingManagementHub({ propertyId }: { propertyId: string }) {
  const sdk = useAuthenticatedSDK();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [serviceFee, setServiceFee] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [agentSearchQuery, setAgentSearchQuery] = useState("");
  const [agentSearchResults, setAgentSearchResults] = useState<any[]>([]);
  const [isSearchingAgents, setIsSearchingAgents] = useState(false);
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);

  const {
    data: property,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["property", propertyId],
    queryFn: () => sdk!.properties.get(propertyId),
    enabled: !!sdk,
  });

  const { data: agents } = useQuery({
    queryKey: ["agents:verified"],
    queryFn: () => sdk!.agents.listVerified(),
    enabled: !!sdk,
  });

  // Initialize selectedAgent and search query when property loads with existing agent
  useEffect(() => {
    if (property?.agentOwnerId && !selectedAgent) {
      setSelectedAgent(
        typeof property.agentOwnerId === "string"
          ? property.agentOwnerId
          : null,
      );
      // Set search query to agent name if available
      const existingAgent = agents?.find(
        (a: any) => a.id === property.agentOwnerId,
      );
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
        console.error("Agent search failed:", error);
        setAgentSearchResults([]);
      } finally {
        setIsSearchingAgents(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [agentSearchQuery, sdk]);

  const assignMutation = useMutation({
    mutationFn: ({
      agentId,
      serviceFeeUsd,
    }: {
      agentId: string;
      serviceFeeUsd?: number;
    }) => sdk!.properties.assignAgent(propertyId, { agentId, serviceFeeUsd }),
    onSuccess: () => {
      notify.success("Agent assigned successfully");
      queryClient.invalidateQueries({ queryKey: ["property", propertyId] });
      setServiceFee("");
    },
    onError: (err: any) =>
      notify.error(err.message || "Failed to assign agent"),
  });

  const updateFeeMutation = useMutation({
    mutationFn: ({ serviceFeeUsd }: { serviceFeeUsd: number }) =>
      sdk!.properties.updateServiceFee(propertyId, { serviceFeeUsd }),
    onSuccess: () => {
      notify.success("Service fee updated");
      queryClient.invalidateQueries({ queryKey: ["property", propertyId] });
    },
    onError: (err: any) => notify.error(err.message || "Failed to update fee"),
  });

  const handleAssign = () => {
    if (!selectedAgent) return notify.error("Select an agent first");
    const fee = serviceFee ? Number(serviceFee) : undefined;
    assignMutation.mutate({ agentId: selectedAgent, serviceFeeUsd: fee });
  };

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (error || !property)
    return <div className="text-red-500">Failed to load property</div>;

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "management", label: "Management" },
    { id: "interest", label: "Interest" },
    { id: "chats", label: "Chats" },
    { id: "viewings", label: "Viewings" },
    { id: "payments", label: "Payments" },
    { id: "verification", label: "Verification" },
    { id: "ratings", label: "Ratings" },
    { id: "logs", label: "Logs" },
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
        {tabs.map((tab) => (
          <button
            key={tab.id}
            data-tab={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {activeTab === "overview" && <OverviewTab property={property} />}
        {activeTab === "management" && (
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
        {activeTab === "interest" && <InterestTab propertyId={propertyId} />}
        {activeTab === "chats" && <ChatsTab propertyId={propertyId} />}
        {activeTab === "viewings" && <ViewingsTab propertyId={propertyId} />}
        {activeTab === "payments" && <PaymentsTab propertyId={propertyId} />}
        {activeTab === "verification" && (
          <VerificationTab propertyId={propertyId} />
        )}
        {activeTab === "ratings" && <RatingsTab propertyId={propertyId} />}
        {activeTab === "logs" && <LogsTab propertyId={propertyId} />}
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
          <p>{property.displayLocation || "Location not specified"}</p>
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
  property,
  agents,
  selectedAgent,
  setSelectedAgent,
  agentSearchQuery,
  setAgentSearchQuery,
  agentSearchResults,
  isSearchingAgents,
  showAgentDropdown,
  setShowAgentDropdown,
  serviceFee,
  setServiceFee,
  handleAssign,
  isAssigning,
  updateFee,
  isUpdatingFee,
}: any) {
  const assignment = property.assignments?.[0];
  const selectedAgentData =
    agentSearchResults.find((a: any) => a.id === selectedAgent) ||
    agents?.find((a: any) => a.id === selectedAgent);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleAgentSelect = (agent: any) => {
    setSelectedAgent(agent.id);
    setAgentSearchQuery(agent.name || "");
    setShowAgentDropdown(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowAgentDropdown(false);
      }
    };
    if (showAgentDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
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
                    setSelectedAgent("");
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
                      <div className="font-medium">
                        {agent.name || "Unnamed Agent"}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {agent.agentProfile?.verifiedListingsCount || 0}{" "}
                        verified listings
                        {agent.agentProfile?.rating
                          ? ` • Rating: ${agent.agentProfile.rating.toFixed(1)}`
                          : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selectedAgentData && (
              <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-md text-sm">
                <span className="font-medium text-emerald-800">
                  Selected: {selectedAgentData.name}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Service Fee (USD)</Label>
            <Input
              type="number"
              placeholder="e.g. 50"
              value={
                serviceFee ||
                (assignment?.serviceFeeUsdCents
                  ? assignment.serviceFeeUsdCents / 100
                  : "")
              }
              onChange={(e) => setServiceFee(e.target.value)}
            />
          </div>

          <PaymentGate
            featureType={ChargeableItemType.FEATURE}
            targetId={property.id}
            featureName="Agent Assignment"
            featureDescription="Assign a verified agent to manage your property listing"
          >
            <Button
              onClick={
                assignment
                  ? () => updateFee({ serviceFeeUsd: Number(serviceFee) })
                  : handleAssign
              }
              disabled={isAssigning || isUpdatingFee}
            >
              {assignment ? "Update Fee" : "Assign Agent"}
            </Button>
          </PaymentGate>

          {assignment && (
            <div className="mt-4 p-4 bg-blue-50 text-blue-800 rounded-md text-sm flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">
                  Assigned to {property.agentOwner?.name}
                </p>
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
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-purple-600" />
          Featured Listing
        </CardTitle>
      </CardHeader>
      <CardContent>
        <PaymentGate
          featureType={ChargeableItemType.BOOST}
          targetId={propertyId}
          featureName="Featured Listing"
          featureDescription="Boost your listing visibility for 7 days"
        >
          <div className="space-y-3">
            <p className="text-sm text-neutral-600">
              Feature boosts are activated after payment. We'll mark your
              listing featured once the payment clears.
            </p>
          </div>
        </PaymentGate>
      </CardContent>
    </Card>
  );
}

function InterestTab({ propertyId }: { propertyId: string }) {
  const {
    data: interests,
    isLoading,
    refetch,
  } = useQuery<PropertyInterest[]>({
    queryKey: ["interests", propertyId],
    queryFn: async () => getInterestsForProperty(propertyId),
    initialData: [] as PropertyInterest[],
  });

  const handleAccept = async (id: string) => {
    try {
      const result = await acceptInterest(id);
      if (result.error) {
        notify.error(result.error);
      } else {
        notify.success("Offer accepted");
        refetch();
      }
    } catch (e) {
      notify.error("Failed to accept offer");
    }
  };

  const handleReject = async (id: string) => {
    try {
      const result = await rejectInterest(id);
      if (result.error) {
        notify.error(result.error);
      } else {
        notify.success("Offer rejected");
        refetch();
      }
    } catch (e) {
      notify.error("Failed to reject offer");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      { bg: string; border: string; text: string; label: string }
    > = {
      PENDING: {
        bg: "bg-neutral-100",
        border: "border-neutral-200",
        text: "text-neutral-600",
        label: "Pending",
      },
      ACCEPTED: {
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        text: "text-emerald-700",
        label: "Accepted",
      },
      ON_HOLD: {
        bg: "bg-amber-50",
        border: "border-amber-200",
        text: "text-amber-700",
        label: "On Hold",
      },
      REJECTED: {
        bg: "bg-red-50",
        border: "border-red-200",
        text: "text-red-700",
        label: "Rejected",
      },
      CONFIRMED: {
        bg: "bg-blue-50",
        border: "border-blue-200",
        text: "text-blue-700",
        label: "Confirmed",
      },
    };
    const config = statusConfig[status] || statusConfig.PENDING;
    return (
      <span
        className={`px-2 py-0.5 text-xs rounded-full border ${config.bg} ${config.border} ${config.text}`}
      >
        {config.label}
      </span>
    );
  };

  const getDaysUntilAutoConfirm = (updatedAt: Date | string) => {
    const updated = new Date(updatedAt);
    const daysSince = Math.floor(
      (Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24),
    );
    const daysRemaining = 30 - daysSince;
    return daysRemaining > 0 ? daysRemaining : 0;
  };

  if (isLoading) return <Skeleton className="h-64" />;
  if (!interests?.length)
    return (
      <div className="p-8 text-center text-neutral-500">
        No interest requests yet.
      </div>
    );

  return (
    <div className="space-y-4">
      {interests.map((interest: PropertyInterest) => {
        const isActionable = interest.status === "PENDING";
        const daysRemaining =
          interest.status === "ACCEPTED"
            ? getDaysUntilAutoConfirm(interest.updatedAt)
            : null;

        return (
          <Card key={interest.id} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-lg">
                      {interest.user.name || "Anonymous"}
                    </span>
                    {interest.user.isVerified && (
                      <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                        Verified
                      </span>
                    )}
                    {getStatusBadge(interest.status)}
                  </div>
                  <p className="text-sm text-neutral-500 mb-2">
                    Expressed on{" "}
                    {new Date(interest.createdAt).toLocaleDateString()}
                  </p>

                  {interest.offerAmount && (
                    <p className="font-medium text-emerald-600 mb-2">
                      Offer:{" "}
                      {formatCurrency(Number(interest.offerAmount), "USD")}
                    </p>
                  )}
                  {interest.message && (
                    <div className="bg-neutral-50 p-3 rounded text-sm text-neutral-700 italic mb-2">
                      "{interest.message}"
                    </div>
                  )}
                  {interest.status === "ACCEPTED" && daysRemaining !== null && (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                      {daysRemaining > 0
                        ? `Auto-confirmation in ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}`
                        : "Auto-confirmation pending"}
                    </div>
                  )}
                  {interest.status === "ON_HOLD" && (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                      This offer is on hold because another offer was accepted.
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {isActionable && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        onClick={() => handleAccept(interest.id)}
                      >
                        <Check className="h-4 w-4 mr-1" /> Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleReject(interest.id)}
                      >
                        <X className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    </>
                  )}
                  {!isActionable && (
                    <span className="text-xs text-neutral-400 italic">
                      No actions available
                    </span>
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
  const {
    data: threads,
    isLoading: threadsLoading,
    error: threadsError,
  } = useQuery<{ user: any; lastMessage: any; unreadCount: number }[]>({
    queryKey: ["chat-threads", propertyId],
    queryFn: async () => getChatThreads(propertyId),
    refetchInterval: 10000,
    initialData: [] as { user: any; lastMessage: any; unreadCount: number }[],
  });

  if (threadsLoading) return <Skeleton className="h-96" />;

  if (threadsError) {
    const message =
      threadsError instanceof Error
        ? threadsError.message
        : "Unable to load chats.";
    return (
      <div className="p-6 border rounded-lg bg-red-50 text-red-700">
        {message}
      </div>
    );
  }

  if (selectedThread) {
    return (
      <ChatThreadView
        propertyId={propertyId}
        userId={selectedThread}
        onBack={() => setSelectedThread(null)}
      />
    );
  }

  if (!threads?.length)
    return (
      <div className="p-8 text-center text-neutral-500">No active chats.</div>
    );

  return (
    <div className="space-y-2">
      {threads.map((thread: any) => (
        <div
          key={thread.user.id}
          className="flex items-center p-4 border rounded-lg hover:bg-neutral-50 cursor-pointer transition-colors"
          onClick={() => setSelectedThread(thread.user.id)}
        >
          <div className="h-10 w-10 bg-neutral-200 rounded-full flex items-center justify-center text-neutral-500 font-bold mr-3">
            {thread.user.name?.[0] || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold truncate">
                {thread.user.name || "Anonymous"}
              </span>
              <span className="text-xs text-neutral-400">
                {formatDate(thread.lastMessage.createdAt)}
              </span>
            </div>
            <p className="text-sm text-neutral-600 truncate">
              {thread.lastMessage.body}
            </p>
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

function ChatThreadView({
  propertyId,
  userId,
  onBack,
}: {
  propertyId: string;
  userId: string;
  onBack: () => void;
}) {
  const [text, setText] = useState("");
  const queryClient = useQueryClient();

  const {
    data: messages,
    isLoading,
    error: messagesError,
  } = useQuery({
    queryKey: ["chat-messages", propertyId, userId],
    queryFn: async () => getThreadMessages(propertyId, userId),
    refetchInterval: 5000,
  });

  const sendMut = useMutation({
    mutationFn: (body: string) => sendMessage(propertyId, userId, body),
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({
        queryKey: ["chat-messages", propertyId, userId],
      });
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendMut.mutate(text);
  };

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
        {messagesError && (
          <div className="p-3 rounded bg-red-50 text-sm text-red-700">
            {messagesError instanceof Error
              ? messagesError.message
              : "Unable to load messages."}
          </div>
        )}
        {messages?.map((msg: any) => {
          const isMe = msg.senderId !== userId; // userId is the counterparty
          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  isMe
                    ? "bg-emerald-600 text-white"
                    : "bg-neutral-100 text-neutral-800"
                }`}
              >
                <p className="text-sm">{msg.body}</p>
                <p
                  className={`text-[10px] mt-1 ${isMe ? "text-emerald-100" : "text-neutral-400"}`}
                >
                  {formatDate(msg.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <form onSubmit={handleSend} className="p-3 border-t flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          disabled={sendMut.isPending}
        />
        <Button type="submit" size="icon" disabled={sendMut.isPending}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

function ViewingsTab({ propertyId }: { propertyId: string }) {
  const { data: viewings, isLoading } = useQuery<PropertyViewing[]>({
    queryKey: ["viewings", propertyId],
    queryFn: async () => getViewings(propertyId),
    initialData: [] as PropertyViewing[],
  });

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3 bg-blue-50 p-4 rounded-lg">
        <div className="flex gap-2 items-center text-blue-800">
          <Calendar className="h-5 w-5" />
          <span className="font-medium">Schedule Viewing</span>
        </div>
        <span className="text-xs text-blue-700">
          Viewings are created by interested tenants after acceptance.
        </span>
      </div>

      {!viewings?.length ? (
        <div className="p-8 text-center text-neutral-500">
          No upcoming viewings scheduled.
        </div>
      ) : (
        viewings.map((v: PropertyViewing) => (
          <Card key={v.id}>
            <CardContent className="p-4 flex justify-between items-center">
              <div className="flex gap-3">
                <div className="bg-neutral-100 p-2 rounded-lg flex flex-col items-center justify-center min-w-[60px]">
                  <span className="text-xs text-neutral-500">
                    {new Date(v.scheduledAt)
                      .toLocaleDateString(undefined, { month: "short" })
                      .toUpperCase()}
                  </span>
                  <span className="text-xl font-bold">
                    {new Date(v.scheduledAt).getDate()}
                  </span>
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
  const sdk = useAuthenticatedSDK();
  const queryClient = useQueryClient();

  const {
    data: verificationRequest,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["verification-request", propertyId],
    queryFn: () => sdk!.properties.getVerificationRequest(propertyId),
    enabled: !!sdk,
    retry: 1,
  });

  const { data: payments } = useQuery({
    queryKey: ["payments", propertyId],
    queryFn: () => sdk!.properties.getPayments(propertyId),
    enabled: !!sdk,
  });

  const verificationPayment = payments?.find(
    (p: any) => p.type === "VERIFICATION" && p.status === "PENDING",
  );

  const submitMut = useMutation({
    mutationFn: (payload: any) =>
      sdk!.properties.submitForVerification(propertyId, payload),
    onSuccess: () => {
      notify.success("Verification request submitted");
      queryClient.invalidateQueries({
        queryKey: ["verification-request", propertyId],
      });
      queryClient.invalidateQueries({ queryKey: ["payments", propertyId] });
    },
    onError: (err: any) =>
      notify.error(err.message || "Failed to submit verification"),
  });

  const updateItemMut = useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: any }) =>
      sdk!.properties.updateVerificationItem(propertyId, itemId, payload),
    onSuccess: () => {
      notify.success("Verification item updated");
      queryClient.invalidateQueries({
        queryKey: ["verification-request", propertyId],
      });
    },
    onError: (err: any) => notify.error(err.message || "Failed to update item"),
  });

  if (isLoading) return <Skeleton className="h-64" />;

  if (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load verification request";
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-600">{message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!verificationRequest) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-neutral-500">
          No verification request yet. Submit documents below to start.
        </CardContent>
      </Card>
    );
  }

  const overallStatus = verificationRequest.status || "NONE";
  const items = verificationRequest.items || [];
  const proofItem = items.find((i: any) => i.type === "PROOF_OF_OWNERSHIP");
  const locationItem = items.find(
    (i: any) => i.type === "LOCATION_CONFIRMATION",
  );
  const photosItem = items.find((i: any) => i.type === "PROPERTY_PHOTOS");

  const checkIsLocked = (item: any) => {
    if (!item) return false;
    if (item.status === "APPROVED") return true;
    if (item.status === "REJECTED") return false; // Always allow retry if rejected
    // If SUBMITTED, check time window. PENDING stays editable.
    if (item.status === "SUBMITTED") {
      const updatedAt = new Date(item.updatedAt).getTime();
      const now = Date.now();
      const thirtyMinutes = 30 * 60 * 1000;
      return now - updatedAt > thirtyMinutes;
    }
    return false;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> =
      {
        PENDING: {
          bg: "bg-neutral-100",
          text: "text-neutral-700",
          label: "Pending",
        },
        SUBMITTED: {
          bg: "bg-blue-100",
          text: "text-blue-700",
          label: "Submitted",
        },
        APPROVED: {
          bg: "bg-emerald-100",
          text: "text-emerald-700",
          label: "Approved",
        },
        REJECTED: { bg: "bg-red-100", text: "text-red-700", label: "Rejected" },
      };
    const style = config[status] || config.PENDING;
    return (
      <span
        className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}
      >
        {style.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Payment Notice */}
      {verificationPayment &&
        verificationPayment.amountCents > 0 &&
        verificationRequest?.property?.verificationLevel !== "VERIFIED" && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <div className="flex-1">
                  <p className="font-medium text-amber-900">
                    Verification payment required
                  </p>
                  <p className="text-sm text-amber-700">
                    Please complete payment before verification can proceed.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const paymentsTab = document.querySelector(
                      '[data-tab="payments"]',
                    ) as HTMLElement;
                    paymentsTab?.click();
                  }}
                >
                  Go to Payments
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

      {/* Overall Status */}
      <Card>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div
              className={`h-12 w-12 rounded-full flex items-center justify-center ${
                overallStatus === "APPROVED"
                  ? "bg-emerald-100 text-emerald-600"
                  : overallStatus === "PENDING"
                    ? "bg-yellow-100 text-yellow-600"
                    : overallStatus === "REJECTED"
                      ? "bg-red-100 text-red-600"
                      : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {overallStatus === "APPROVED" ? (
                <ShieldCheck className="h-6 w-6" />
              ) : overallStatus === "PENDING" ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : overallStatus === "REJECTED" ? (
                <AlertTriangle className="h-6 w-6" />
              ) : (
                <ShieldCheck className="h-6 w-6" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">
                    {overallStatus === "APPROVED"
                      ? "Property Verified"
                      : overallStatus === "PENDING"
                        ? "Verification Pending"
                        : overallStatus === "REJECTED"
                          ? "Verification Rejected"
                          : "Not Started"}
                  </h3>
                  <p className="text-sm text-neutral-500 mb-2">
                    {overallStatus === "APPROVED"
                      ? "This property has been verified by our team."
                      : overallStatus === "PENDING"
                        ? "Our team is reviewing your documentation."
                        : overallStatus === "REJECTED"
                          ? "Verification was rejected. Please submit new documentation."
                          : "Complete all steps below to request verification."}
                  </p>
                </div>
                {/* Level Badge */}
                {verificationRequest?.property?.verificationLevel &&
                  verificationRequest.property.verificationLevel !== "NONE" && (
                    <div className="flex items-center gap-2">
                      {(() => {
                        const level =
                          verificationRequest.property.verificationLevel;
                        const badges = {
                          BASIC: {
                            label: "Bronze Verification",
                            color:
                              "bg-orange-100 text-orange-800 border-orange-200",
                          },
                          TRUSTED: {
                            label: "Silver Verification",
                            color:
                              "bg-slate-100 text-slate-800 border-slate-200",
                          },
                          VERIFIED: {
                            label: "Gold Verification",
                            color:
                              "bg-yellow-100 text-yellow-800 border-yellow-200",
                          },
                        };
                        const badge = badges[level as keyof typeof badges];
                        if (!badge) return null;
                        return (
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.color}`}
                          >
                            <ShieldCheck className="h-4 w-4" />
                            {badge.label}
                          </span>
                        );
                      })()}
                    </div>
                  )}
              </div>

              {/* Score Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-neutral-700 flex items-center gap-1">
                    Verification Strength
                    <div
                      title="Score is based on approved verification items. Higher score improves listing visibility and trust."
                      className="cursor-help"
                    >
                      <Info className="h-3 w-3 text-neutral-400" />
                    </div>
                  </span>
                  <span className="text-neutral-500">
                    {verificationRequest?.property?.verificationScore || 0} /
                    110+ Points
                  </span>
                </div>
                <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{
                      width: `${Math.min(((verificationRequest?.property?.verificationScore || 0) / 110) * 100, 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  Complete more verifications to increase listing trust and
                  visibility.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification Steps */}
      <div className="space-y-4">
        {/* Step 1: Proof of Ownership */}
        <VerificationStep
          title="Proof of Ownership"
          description="Upload title deed or utility bill (Max 5 files)"
          icon={<FileText className="h-5 w-5" />}
          item={proofItem}
          statusBadge={getStatusBadge(proofItem?.status || "PENDING")}
          isDisabled={checkIsLocked(proofItem)}
          onSubmit={(evidenceUrls) => {
            if (verificationRequest && proofItem) {
              updateItemMut.mutate({
                itemId: proofItem.id,
                payload: { evidenceUrls },
              });
            } else {
              submitMut.mutate({
                proofOfOwnershipUrls: evidenceUrls,
              });
            }
          }}
          type="proof"
          propertyId={propertyId}
        />

        {/* Step 2: Location Confirmation */}
        <VerificationStep
          title="Location Confirmation"
          description="Submit GPS coordinates or request on-site visit"
          icon={<MapPinIcon className="h-5 w-5" />}
          item={locationItem}
          statusBadge={getStatusBadge(locationItem?.status || "PENDING")}
          isDisabled={checkIsLocked(locationItem)}
          onSubmit={(data) => {
            if (verificationRequest && locationItem) {
              updateItemMut.mutate({
                itemId: locationItem.id,
                payload: data,
              });
            } else {
              submitMut.mutate({
                locationGpsLat: data.gpsLat,
                locationGpsLng: data.gpsLng,
                requestOnSiteVisit: data.requestOnSiteVisit,
              });
            }
          }}
          type="location"
          propertyId={propertyId}
        />

        {/* Step 3: Property Photos */}
        <VerificationStep
          title="Property Photos"
          description="Upload current photos of the property (Max 5 files)"
          icon={<Camera className="h-5 w-5" />}
          item={photosItem}
          statusBadge={getStatusBadge(photosItem?.status || "PENDING")}
          isDisabled={checkIsLocked(photosItem)}
          onSubmit={(evidenceUrls) => {
            if (verificationRequest && photosItem) {
              updateItemMut.mutate({
                itemId: photosItem.id,
                payload: { evidenceUrls },
              });
            } else {
              submitMut.mutate({
                propertyPhotoUrls: evidenceUrls,
              });
            }
          }}
          type="photos"
          propertyId={propertyId}
        />
      </div>
    </div>
  );
}

function VerificationStep({
  title,
  description,
  icon,
  item,
  statusBadge,
  isDisabled,
  onSubmit,
  type,
  propertyId,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  item: any;
  statusBadge: React.ReactNode;
  isDisabled: boolean;
  onSubmit: (data: any) => void;
  type: "proof" | "location" | "photos";
  propertyId: string;
}) {
  const sdk = useAuthenticatedSDK();
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>(
    item?.evidenceUrls || [],
  );
  const [gpsLat, setGpsLat] = useState<number | undefined>(
    item?.gpsLat || undefined,
  );
  const [gpsLng, setGpsLng] = useState<number | undefined>(
    item?.gpsLng || undefined,
  );
  const [requestOnSiteVisit, setRequestOnSiteVisit] = useState<boolean>(
    !!item?.notes?.includes("On-site visit"),
  );
  const [uploading, setUploading] = useState(false);

  // Sync with item when it changes
  useEffect(() => {
    if (item) {
      setEvidenceUrls(item.evidenceUrls || []);
      setGpsLat(item.gpsLat || undefined);
      setGpsLng(item.gpsLng || undefined);
      setRequestOnSiteVisit(!!item.notes?.includes("On-site visit"));
    }
  }, [item]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !sdk) return;

    // Multi-file upload logic
    // Check limits
    const currentCount = evidenceUrls.length;
    const newCount = files.length;
    if (currentCount + newCount > 5) {
      notify.error("Maximum 5 files allowed per item");
      return;
    }

    setUploading(true);
    try {
      const uploadedUrls: string[] = [];

      // Upload sequentially to avoid overwhelming
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate file type
        if (type === "proof") {
          const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ];
          if (!allowedTypes.includes(file.type)) {
            notify.error(
              `Skipped ${file.name}: Invalid file type. Use PDF, DOC, DOCX, JPG, PNG, WebP.`,
            );
            continue;
          }
        } else if (type === "photos") {
          const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
          if (!allowedTypes.includes(file.type)) {
            notify.error(
              `Skipped ${file.name}: Invalid file type. Use JPG, PNG, WebP.`,
            );
            continue;
          }
        }

        const result = await sdk.properties.uploadMedia(propertyId, file);
        uploadedUrls.push(result.url);
      }

      if (uploadedUrls.length > 0) {
        setEvidenceUrls((prev) => [...prev, ...uploadedUrls]);
        notify.success(`Uploaded ${uploadedUrls.length} files`);
      }
    } catch (error) {
      notify.error("Failed to upload file(s)");
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleCaptureGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsLat(position.coords.latitude);
          setGpsLng(position.coords.longitude);
          notify.success("GPS coordinates captured");
        },
        () => notify.error("Failed to get GPS coordinates"),
      );
    } else {
      notify.error("GPS not available in this browser");
    }
  };

  const handleSubmit = () => {
    if (type === "location") {
      onSubmit({ gpsLat, gpsLng, requestOnSiteVisit });
    } else {
      onSubmit(evidenceUrls);
    }
  };

  const handleRemoveFile = (index: number) => {
    setEvidenceUrls((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600">
              {icon}
            </div>
            <div>
              <h4 className="font-semibold">{title}</h4>
              <p className="text-sm text-neutral-500">{description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">{statusBadge}</div>
        </div>

        {(item?.notes ||
          item?.status === "APPROVED" ||
          item?.status === "REJECTED") && (
          <div
            className={`mb-4 p-3 rounded-lg ${
              item?.status === "APPROVED"
                ? "bg-emerald-50 border border-emerald-200"
                : item?.status === "REJECTED"
                  ? "bg-red-50 border border-red-200"
                  : "bg-neutral-50 border border-neutral-200"
            }`}
          >
            <p className="text-sm font-medium mb-1">
              {item?.status === "APPROVED"
                ? item?.notes?.includes("On-site visit")
                  ? "Site Visit Verified"
                  : "Verified"
                : item?.status === "REJECTED"
                  ? "Rejected"
                  : "Note"}
              {item?.verifier ? ` by ${item.verifier.name}` : ""}
              {item?.reviewedAt &&
                ` on ${new Date(item.reviewedAt).toLocaleDateString()}`}
            </p>
            <p className="text-xs text-neutral-600">{item?.notes}</p>
          </div>
        )}

        {!isDisabled && (
          <div className="space-y-4">
            {type === "proof" || type === "photos" ? (
              <>
                <div>
                  <Label>Upload Files</Label>
                  <input
                    type="file"
                    multiple
                    accept={
                      type === "proof"
                        ? ".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                        : ".jpg,.jpeg,.png,.webp"
                    }
                    onChange={(e) => handleFileUpload(e.target.files)}
                    disabled={uploading || evidenceUrls.length >= 5}
                    className="mt-1 block w-full text-sm text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 disabled:opacity-50"
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    {type === "proof"
                      ? "Accept: PDF, DOC, DOCX, JPG, PNG, WebP (Max 5)"
                      : "Accept: JPG, PNG, WebP (Max 5)"}
                  </p>
                  {uploading && (
                    <p className="text-xs text-neutral-500 mt-1">
                      Uploading...
                    </p>
                  )}
                </div>
                {evidenceUrls.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {evidenceUrls.map((url, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-video bg-neutral-100 rounded overflow-hidden group border"
                      >
                        {url.endsWith(".pdf") ||
                        url.includes(".pdf") ||
                        url.includes(".doc") ? (
                          <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                            <FileText className="h-8 w-8 text-neutral-400 mb-1" />
                            <span className="text-[10px] text-neutral-500 truncate w-full px-1">
                              {url.split("/").pop()}
                            </span>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-blue-500 hover:underline mt-1"
                            >
                              View
                            </a>
                          </div>
                        ) : (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full h-full"
                          >
                            <img
                              src={url}
                              alt={`Evidence ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </a>
                        )}
                        {!isDisabled && (
                          <button
                            onClick={(e: any) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleRemoveFile(idx);
                            }}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="space-y-3">
                  <div>
                    <Label>GPS Coordinates</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="number"
                        placeholder="Latitude"
                        value={gpsLat || ""}
                        onChange={(e) => setGpsLat(parseFloat(e.target.value))}
                        step="any"
                      />
                      <Input
                        type="number"
                        placeholder="Longitude"
                        value={gpsLng || ""}
                        onChange={(e) => setGpsLng(parseFloat(e.target.value))}
                        step="any"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCaptureGPS}
                        className="whitespace-nowrap"
                      >
                        <Navigation className="h-4 w-4 mr-1" />
                        Capture GPS
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="onSiteVisit"
                      checked={requestOnSiteVisit}
                      onChange={(e) => setRequestOnSiteVisit(e.target.checked)}
                      className="rounded"
                    />
                    <Label
                      htmlFor="onSiteVisit"
                      className="font-normal cursor-pointer"
                    >
                      Request on-site visit instead
                    </Label>
                  </div>
                  {gpsLat && gpsLng && (
                    <div className="flex items-center justify-between p-2 bg-neutral-50 rounded text-xs text-neutral-600">
                      <span>
                        Coordinates: {gpsLat.toFixed(6)}, {gpsLng.toFixed(6)}
                      </span>
                      {!isDisabled && (
                        <button
                          onClick={() => {
                            setGpsLat(undefined);
                            setGpsLng(undefined);
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )}
                  {requestOnSiteVisit && (
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded text-xs text-blue-700">
                      <span>On-site visit requested</span>
                      {!isDisabled && (
                        <button
                          onClick={() => setRequestOnSiteVisit(false)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
            {!item ? (
              <PaymentGate
                featureType={ChargeableItemType.FEATURE}
                targetId={propertyId}
                featureName="Property Verification"
                featureDescription="Complete payment to submit your property for verification"
              >
                <Button
                  onClick={handleSubmit}
                  disabled={
                    uploading ||
                    (type === "proof" || type === "photos"
                      ? evidenceUrls.length === 0
                      : type === "location"
                        ? !((gpsLat && gpsLng) || requestOnSiteVisit)
                        : false)
                  }
                >
                  {uploading ? "Uploading..." : "Submit"}
                </Button>
              </PaymentGate>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={
                  uploading ||
                  (type === "proof" || type === "photos"
                    ? evidenceUrls.length === 0
                    : type === "location"
                      ? !((gpsLat && gpsLng) || requestOnSiteVisit)
                      : false)
                }
              >
                {uploading ? "Uploading..." : "Update"}
              </Button>
            )}
            {(type === "proof" || type === "photos") &&
              evidenceUrls.length === 0 && (
                <p className="text-xs text-neutral-500">
                  Please upload a file to submit
                </p>
              )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PaymentsTab({ propertyId }: { propertyId: string }) {
  const sdk = useAuthenticatedSDK();

  const {
    data: payments,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["payments", propertyId],
    queryFn: () => sdk!.properties.getPayments(propertyId),
    enabled: !!sdk,
  });

  const getPaymentTitle = (type: string, metadata: any) => {
    switch (type) {
      case "AGENT_FEE":
        return `Agent Service Fee${metadata?.agentName ? ` - ${metadata.agentName}` : ""}`;
      case "FEATURED":
        return "Featured Listing";
      case "VERIFICATION":
        return "Property Verification";
      case "OTHER":
        return metadata?.description || "Other Payment";
      default:
        return type;
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> =
      {
        PENDING: {
          bg: "bg-yellow-100",
          text: "text-yellow-700",
          label: "Pending",
        },
        PAID: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Paid" },
        FAILED: { bg: "bg-red-100", text: "text-red-700", label: "Failed" },
      };
    const style = config[status] || config.PENDING;
    return (
      <span
        className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}
      >
        {style.label}
      </span>
    );
  };

  const handlePayNow = (payment: any) => {
    const redirectUrl = payment.invoice?.paymentIntents?.[0]?.redirectUrl;
    if (redirectUrl) {
      window.location.href = redirectUrl;
    } else {
      notify.error("Payment URL not available. Please contact support.");
    }
  };

  if (isLoading) return <Skeleton className="h-64" />;

  if (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to load payments";
    if (errorMessage.includes("403") || errorMessage.includes("Forbidden")) {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
            <p className="text-neutral-600">
              You don't have permission to view payments for this listing.
            </p>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-600">
            Failed to load payments: {errorMessage}
          </p>
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
              <p className="text-neutral-500">
                No payments yet for this listing.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment: any) => {
                const isPending = payment.status === "PENDING";
                const canPay =
                  isPending &&
                  payment.invoice?.paymentIntents?.[0]?.redirectUrl;
                const amount = payment.amountCents / 100;
                const formattedAmount = formatCurrency(
                  amount,
                  payment.currency as any,
                );

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
                        {new Date(payment.createdAt).toLocaleDateString(
                          "en-ZW",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          },
                        )}
                      </p>
                      {payment.reference && (
                        <p className="text-xs text-neutral-400">
                          Ref: {payment.reference}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4 ml-4">
                      <div className="text-right">
                        <p className="font-bold text-lg text-neutral-900">
                          {formattedAmount}
                        </p>
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
  const sdk = useAuthenticatedSDK();
  const queryClient = useQueryClient();

  const {
    data: ratingsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["ratings", propertyId],
    queryFn: () => sdk!.properties.getRatings(propertyId),
    enabled: !!sdk,
  });

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [ratingType, setRatingType] = useState<
    "PREVIOUS_TENANT" | "CURRENT_TENANT" | "VISITOR"
  >("VISITOR");

  const submitMut = useMutation({
    mutationFn: (payload: any) =>
      sdk!.properties.submitRating(propertyId, payload),
    onSuccess: () => {
      notify.success("Rating submitted successfully");
      setRating(0);
      setComment("");
      setIsAnonymous(false);
      queryClient.invalidateQueries({ queryKey: ["ratings", propertyId] });
    },
    onError: (err: any) => {
      const errorMessage = err.message || "Failed to submit rating";
      if (errorMessage.includes("cannot rate your own")) {
        notify.error("You cannot rate your own property");
      } else if (errorMessage.includes("already rated")) {
        notify.error("You have already rated this property");
      } else {
        notify.error(errorMessage);
      }
    },
  });

  const getReviewerLabel = (type: string, isVerifiedTenant?: boolean) => {
    switch (type) {
      case "PREVIOUS_TENANT":
        return isVerifiedTenant
          ? "Verified Previous Tenant"
          : "Previous Tenant";
      case "CURRENT_TENANT":
        return "Current Tenant";
      case "VISITOR":
        return "Visitor";
      case "ANONYMOUS":
        return "Anonymous Tenant";
      default:
        return "Reviewer";
    }
  };

  const renderStars = (value: number, size: "sm" | "md" | "lg" = "md") => {
    const sizeClasses = {
      sm: "h-3 w-3",
      md: "h-4 w-4",
      lg: "h-6 w-6",
    };
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${star <= value ? "fill-yellow-400 text-yellow-400" : "text-neutral-300"}`}
          />
        ))}
      </div>
    );
  };

  if (isLoading) return <Skeleton className="h-64" />;

  if (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to load ratings";
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-600">Failed to load ratings: {errorMessage}</p>
        </CardContent>
      </Card>
    );
  }

  const aggregate = ratingsData?.aggregate;
  const ratings = ratingsData?.ratings || [];
  const userRating = ratingsData?.userRating;
  const canSubmitRating = !userRating;

  return (
    <div className="space-y-6">
      {/* Aggregated Rating Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
            Ratings & Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          {aggregate && aggregate.totalCount > 0 ? (
            <div className="space-y-6">
              {/* Overall Rating Display */}
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-5xl font-bold text-neutral-900 mb-1">
                    {aggregate.average.toFixed(1)}
                  </div>
                  <div className="mb-2">
                    {renderStars(Math.round(aggregate.average), "md")}
                  </div>
                  <p className="text-sm text-neutral-500">
                    {aggregate.totalCount}{" "}
                    {aggregate.totalCount === 1 ? "rating" : "ratings"}
                  </p>
                </div>

                {/* Rating Distribution */}
                <div className="flex-1 space-y-2">
                  {[5, 4, 3, 2, 1].map((starValue) => {
                    const count =
                      aggregate.ratingCounts[
                        starValue as keyof typeof aggregate.ratingCounts
                      ] || 0;
                    const percentage =
                      aggregate.totalCount > 0
                        ? (count / aggregate.totalCount) * 100
                        : 0;
                    return (
                      <div key={starValue} className="flex items-center gap-3">
                        <div className="flex items-center gap-1 w-16">
                          <span className="text-sm font-medium">
                            {starValue}
                          </span>
                          <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                        </div>
                        <div className="flex-1 h-2 bg-neutral-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-400 transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-neutral-500 w-8 text-right">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Star className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
              <p className="text-neutral-500">
                No ratings yet for this property.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit Rating Form */}
      {canSubmitRating && (
        <Card>
          <CardHeader>
            <CardTitle>Leave a Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Your Rating</Label>
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className="focus:outline-none"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                    >
                      <Star
                        className={`h-8 w-8 transition-colors ${
                          star <= (hoverRating || rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-neutral-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Reviewer Type</Label>
                <select
                  value={ratingType}
                  onChange={(e) => setRatingType(e.target.value as any)}
                  className="mt-1 block w-full rounded-md border-neutral-300 py-2 px-3 text-sm"
                >
                  <option value="VISITOR">Visitor</option>
                  <option value="PREVIOUS_TENANT">Previous Tenant</option>
                  <option value="CURRENT_TENANT">Current Tenant</option>
                </select>
              </div>

              {ratingType === "CURRENT_TENANT" && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="anonymous"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="rounded"
                  />
                  <Label
                    htmlFor="anonymous"
                    className="font-normal cursor-pointer"
                  >
                    Submit anonymously
                  </Label>
                </div>
              )}

              <div>
                <Label>Comment (Optional)</Label>
                <textarea
                  className="mt-1 block w-full rounded-md border-neutral-300 py-2 px-3 text-sm min-h-[100px]"
                  placeholder="Share your experience..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={1000}
                />
                <p className="text-xs text-neutral-500 mt-1">
                  {comment.length}/1000 characters
                </p>
              </div>

              <Button
                onClick={() => {
                  if (rating === 0) {
                    notify.error("Please select a rating");
                    return;
                  }
                  submitMut.mutate({
                    rating,
                    comment: comment || undefined,
                    type: ratingType,
                    isAnonymous:
                      ratingType === "CURRENT_TENANT" ? isAnonymous : false,
                  });
                }}
                disabled={submitMut.isPending || rating === 0}
              >
                {submitMut.isPending ? "Submitting..." : "Submit Rating"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User's Existing Rating */}
      {userRating && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <div className="flex-1">
                <p className="font-medium text-emerald-900">
                  You have already rated this property
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {renderStars(userRating.rating, "sm")}
                  {userRating.comment && (
                    <p className="text-sm text-emerald-700 italic">
                      "{userRating.comment}"
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ratings List */}
      <Card>
        <CardHeader>
          <CardTitle>All Ratings ({ratings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {ratings.length === 0 ? (
            <div className="text-center py-8 text-neutral-500">
              <p>No ratings yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {ratings.map((r: any) => (
                <div
                  key={r.id}
                  className="border-b pb-4 last:border-0 last:border-b-0"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {r.isAnonymous ? (
                          <>
                            <div className="h-8 w-8 bg-neutral-200 rounded-full flex items-center justify-center font-bold text-xs text-neutral-500">
                              ?
                            </div>
                            <span className="font-semibold text-neutral-600">
                              Anonymous
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="h-8 w-8 bg-neutral-200 rounded-full flex items-center justify-center font-bold text-xs">
                              {r.reviewer?.name?.[0] || "?"}
                            </div>
                            <span className="font-semibold">
                              {r.reviewer?.name || "Anonymous"}
                            </span>
                            {r.reviewer?.isVerified && (
                              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                                Verified
                              </span>
                            )}
                          </>
                        )}
                        <span className="text-xs text-neutral-500">
                          {getReviewerLabel(r.type, r.reviewer?.isVerified)}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400">
                        {new Date(r.createdAt).toLocaleDateString("en-ZW", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div>{renderStars(r.rating, "sm")}</div>
                  </div>
                  {r.comment && (
                    <p className="text-neutral-700 mt-2">{r.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LogsTab({ propertyId }: { propertyId: string }) {
  const sdk = useAuthenticatedSDK();

  const {
    data: activityData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["activity-logs", propertyId],
    queryFn: () => sdk!.properties.getActivityLogs(propertyId),
    enabled: !!sdk,
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "OFFER_RECEIVED":
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case "OFFER_ACCEPTED":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "OFFER_REJECTED":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "OFFER_CONFIRMED":
        return <Handshake className="h-4 w-4 text-emerald-600" />;
      case "OFFER_ON_HOLD":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "AGENT_ASSIGNED":
        return <UserCheck className="h-4 w-4 text-blue-600" />;
      case "AGENT_UNASSIGNED":
        return <UserX className="h-4 w-4 text-neutral-500" />;
      case "PAYMENT_CREATED":
        return <CreditCard className="h-4 w-4 text-blue-500" />;
      case "PAYMENT_PAID":
        return <DollarSign className="h-4 w-4 text-emerald-500" />;
      case "PAYMENT_FAILED":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "VERIFICATION_SUBMITTED":
        return <ShieldCheck className="h-4 w-4 text-blue-500" />;
      case "VERIFICATION_APPROVED":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "VERIFICATION_REJECTED":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "VIEWING_SCHEDULED":
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case "VIEWING_ACCEPTED":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "VIEWING_POSTPONED":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "VIEWING_CANCELLED":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "CHAT_MESSAGE":
        return <MessageSquare className="h-4 w-4 text-neutral-500" />;
      case "RATING_SUBMITTED":
        return <Star className="h-4 w-4 text-yellow-500" />;
      case "PROPERTY_VIEWED":
        return <Eye className="h-4 w-4 text-neutral-400" />;
      default:
        return <History className="h-4 w-4 text-neutral-400" />;
    }
  };

  const getActivityTitle = (
    type: string,
    metadata: Record<string, unknown> | null,
  ) => {
    switch (type) {
      case "OFFER_RECEIVED":
        return "Offer Received";
      case "OFFER_ACCEPTED":
        return "Offer Accepted";
      case "OFFER_REJECTED":
        return metadata?.count
          ? `${metadata.count} Offers Rejected`
          : "Offer Rejected";
      case "OFFER_CONFIRMED":
        return "Offer Confirmed";
      case "OFFER_ON_HOLD":
        return "Offer On Hold";
      case "AGENT_ASSIGNED":
        return metadata?.agentName
          ? `Agent Assigned: ${metadata.agentName}`
          : "Agent Assigned";
      case "AGENT_UNASSIGNED":
        return "Agent Unassigned";
      case "PAYMENT_CREATED":
        return "Payment Created";
      case "PAYMENT_PAID":
        return "Payment Completed";
      case "PAYMENT_FAILED":
        return "Payment Failed";
      case "VERIFICATION_SUBMITTED":
        return "Verification Submitted";
      case "VERIFICATION_APPROVED":
        return "Verification Approved";
      case "VERIFICATION_REJECTED":
        return "Verification Rejected";
      case "VIEWING_SCHEDULED":
        return "Viewing Scheduled";
      case "VIEWING_ACCEPTED":
        return "Viewing Accepted";
      case "VIEWING_POSTPONED":
        return "Viewing Postponed";
      case "VIEWING_CANCELLED":
        return "Viewing Cancelled";
      case "CHAT_MESSAGE":
        return "Chat Message";
      case "RATING_SUBMITTED":
        return "Rating Submitted";
      case "PROPERTY_VIEWED":
        return "Property Viewed";
      default:
        return type.replace(/_/g, " ");
    }
  };

  const getActivityDescription = (
    type: string,
    metadata: Record<string, unknown> | null,
  ) => {
    const parts: string[] = [];
    if (metadata) {
      if (metadata.offerAmount)
        parts.push(
          `Amount: ${formatCurrency(Number(metadata.offerAmount), "USD")}`,
        );
      if (metadata.agentName) parts.push(`Agent: ${metadata.agentName}`);
      if (metadata.reason) parts.push(`Reason: ${metadata.reason}`);
      if (metadata.count && type !== "OFFER_REJECTED")
        parts.push(`Count: ${metadata.count}`);
    }
    return parts.length > 0 ? parts.join(" • ") : null;
  };

  const formatLogDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const logDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );
    if (logDate.getTime() === today.getTime()) {
      return {
        label: "Today",
        time: date.toLocaleTimeString("en-ZW", {
          hour: "numeric",
          minute: "2-digit",
        }),
      };
    } else if (logDate.getTime() === yesterday.getTime()) {
      return {
        label: "Yesterday",
        time: date.toLocaleTimeString("en-ZW", {
          hour: "numeric",
          minute: "2-digit",
        }),
      };
    } else {
      return {
        label: date.toLocaleDateString("en-ZW", {
          month: "long",
          day: "numeric",
          year:
            date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
        }),
        time: date.toLocaleTimeString("en-ZW", {
          hour: "numeric",
          minute: "2-digit",
        }),
      };
    }
  };

  const groupLogsByDay = (logs: NonNullable<typeof activityData>["logs"]) => {
    if (!logs) return {};
    const groups: Record<string, typeof logs> = {};
    logs.forEach((log) => {
      const { label } = formatLogDate(log.createdAt);
      if (!groups[label]) groups[label] = [];
      groups[label].push(log);
    });
    return groups;
  };

  if (isLoading) return <Skeleton className="h-64" />;

  if (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to load activity logs";
    if (errorMessage.includes("403") || errorMessage.includes("Forbidden")) {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
            <p className="text-neutral-600">
              You don't have permission to view activity logs for this listing.
            </p>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-600">
            Failed to load activity logs: {errorMessage}
          </p>
        </CardContent>
      </Card>
    );
  }

  const stats = activityData?.statistics;
  const logs = activityData?.logs || [];
  const groupedLogs = groupLogsByDay(logs);
  const dayLabels = Object.keys(groupedLogs).sort((a, b) => {
    if (a === "Today") return -1;
    if (b === "Today") return 1;
    if (a === "Yesterday") return -1;
    if (b === "Yesterday") return 1;
    return b.localeCompare(a);
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-500">Offers</p>
                <p className="text-2xl font-bold text-neutral-900">
                  {stats ? stats.offers.received : 0}
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  {stats
                    ? `${stats.offers.accepted} accepted, ${stats.offers.confirmed} confirmed`
                    : ""}
                </p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-500">Viewings</p>
                <p className="text-2xl font-bold text-neutral-900">
                  {stats ? stats.viewings.scheduled : 0}
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  {stats ? `${stats.viewings.accepted} accepted` : ""}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-500">Payments</p>
                <p className="text-2xl font-bold text-neutral-900">
                  {stats ? stats.payments.paid : 0}
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  {stats
                    ? `${stats.payments.totalAmount > 0 ? formatCurrency(stats.payments.totalAmount, "USD") : "No revenue"}`
                    : ""}
                </p>
              </div>
              <CreditCard className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-500">
                  Verification
                </p>
                <p className="text-2xl font-bold text-neutral-900">
                  {stats
                    ? stats.verification.approved > 0
                      ? "Verified"
                      : stats.verification.submitted > 0
                        ? "Pending"
                        : "None"
                    : "None"}
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  {stats ? `${stats.verification.approved} approved` : ""}
                </p>
              </div>
              <ShieldCheck className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              <History className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
              <p>No activity logs yet for this listing.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {dayLabels.map((dayLabel) => (
                <div key={dayLabel}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-px flex-1 bg-neutral-200" />
                    <span className="text-sm font-semibold text-neutral-600 px-2">
                      {dayLabel}
                    </span>
                    <div className="h-px flex-1 bg-neutral-200" />
                  </div>
                  <div className="space-y-3">
                    {groupedLogs[dayLabel].map((log) => {
                      const { time } = formatLogDate(log.createdAt);
                      const title = getActivityTitle(
                        log.type,
                        log.metadata as Record<string, unknown> | null,
                      );
                      const description = getActivityDescription(
                        log.type,
                        log.metadata as Record<string, unknown> | null,
                      );
                      return (
                        <div
                          key={log.id}
                          className="flex items-start gap-3 pb-3 border-b last:border-0"
                        >
                          <div className="mt-0.5">
                            {getActivityIcon(log.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="font-medium text-neutral-900">
                                  {title}
                                </p>
                                {description && (
                                  <p className="text-sm text-neutral-500 mt-1">
                                    {description}
                                  </p>
                                )}
                                {log.actor && (
                                  <p className="text-xs text-neutral-400 mt-1">
                                    by {log.actor.name}
                                  </p>
                                )}
                              </div>
                              <span className="text-xs text-neutral-400 whitespace-nowrap">
                                {time}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
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
