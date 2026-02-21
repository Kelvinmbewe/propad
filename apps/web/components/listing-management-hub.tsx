"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
import { getPublicApiBaseUrl } from "@/lib/api-base-url";
import { ChargeableItemType } from "@propad/config";
import { useAuthenticatedSDK } from "@/hooks/use-authenticated-sdk";
import { formatCurrency } from "@/lib/formatters";
import { getImageUrl } from "@/lib/image-url";
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
  const apiBaseUrl = getPublicApiBaseUrl();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [serviceFee, setServiceFee] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [managedByType, setManagedByType] = useState<
    "OWNER" | "AGENT" | "AGENCY"
  >("OWNER");
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);
  const [selectedOperatingAgentId, setSelectedOperatingAgentId] = useState<
    string | null
  >(null);
  const [agentSearchQuery, setAgentSearchQuery] = useState("");
  const [agentSearchResults, setAgentSearchResults] = useState<any[]>([]);
  const [isSearchingAgents, setIsSearchingAgents] = useState(false);
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [agencySearchQuery, setAgencySearchQuery] = useState("");
  const [agencySearchResults, setAgencySearchResults] = useState<any[]>([]);
  const [isSearchingAgencies, setIsSearchingAgencies] = useState(false);
  const [showAgencyDropdown, setShowAgencyDropdown] = useState(false);
  const [agentFeeConfig, setAgentFeeConfig] = useState<
    Array<{ min: number; max: number; feeUsd: number; label?: string }>
  >([]);
  const [featuredPlans, setFeaturedPlans] = useState<
    Array<{
      id: string;
      label: string;
      durationDays: number;
      discountPercent?: number;
      feeUsdCents?: number;
      description?: string;
    }>
  >([]);
  const [selectedFeaturedPlan, setSelectedFeaturedPlan] = useState<
    string | null
  >(null);
  const [featuredPricing, setFeaturedPricing] = useState<any>(null);
  const [featuredBasePriceUsd, setFeaturedBasePriceUsd] = useState<
    number | null
  >(null);
  const [featuredProcessing, setFeaturedProcessing] = useState(false);
  const [enabledPaymentProviders, setEnabledPaymentProviders] = useState<any[]>(
    [],
  );
  const [defaultPaymentProvider, setDefaultPaymentProvider] = useState<
    any | null
  >(null);
  const [verificationCosts, setVerificationCosts] = useState<any>(null);

  const {
    data: property,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["property", propertyId],
    queryFn: async () => sdk!.properties.get(propertyId),
    enabled: !!sdk,
    retry: 1,
    initialData: null,
    staleTime: 5000,
    refetchOnWindowFocus: false,
    refetchOnMount: "always",
  });

  const { data: myAgency } = useQuery({
    queryKey: ["agency", "my"],
    queryFn: async () => sdk!.agencies.getMy(),
    enabled: !!sdk && session?.user?.role === "COMPANY_ADMIN",
    staleTime: 30000,
  });

  const { data: agencyMembers } = useQuery({
    queryKey: ["agency", "members", selectedAgencyId],
    queryFn: async () =>
      selectedAgencyId ? sdk!.agencies.listMembers(selectedAgencyId) : [],
    enabled: !!sdk && !!selectedAgencyId,
    initialData: [] as any[],
    staleTime: 30000,
  });

  const { data: agents } = useQuery({
    queryKey: ["agents:verified"],
    queryFn: async () => sdk!.agents.listVerified(),
    enabled: !!sdk,
    initialData: [] as any[],
    retry: 1,
    staleTime: 30000,
  });

  // Fetch property payments for Featured Listing section
  const { data: propertyPayments } = useQuery({
    queryKey: ["payments", propertyId],
    queryFn: async () => sdk!.properties.getPayments(propertyId),
    enabled: !!sdk && !!propertyId,
    initialData: [] as any[],
    staleTime: 10000,
  });

  useEffect(() => {
    if (!apiBaseUrl || !session?.accessToken) {
      return;
    }

    const fetchConfigs = async () => {
      try {
        const [
          agentFeesResponse,
          featuredPlansResponse,
          featuredPricingResponse,
          enabledProvidersResponse,
          defaultProviderResponse,
          verificationCostsResponse,
        ] = await Promise.all([
          fetch(`${apiBaseUrl}/pricing-config/pricing.agentFees`, {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
            },
          }),
          fetch(`${apiBaseUrl}/pricing-config/pricing.featuredPlans`, {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
            },
          }),
          fetch(`${apiBaseUrl}/features/pricing/BOOST`, {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
            },
          }),
          fetch(`${apiBaseUrl}/payment-providers/enabled`, {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
            },
          }),
          fetch(`${apiBaseUrl}/payment-providers/default`, {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
            },
          }),
          fetch(`${apiBaseUrl}/pricing-config/pricing.verificationCosts`, {
            headers: { Authorization: `Bearer ${session.accessToken}` },
          }),
        ]);

        if (agentFeesResponse.ok) {
          const agentFees = await agentFeesResponse.json();
          if (Array.isArray(agentFees)) {
            setAgentFeeConfig(agentFees);
          } else if (agentFees?.value && Array.isArray(agentFees.value)) {
            setAgentFeeConfig(agentFees.value);
          }
        }

        if (featuredPlansResponse.ok) {
          const plans = await featuredPlansResponse.json();
          if (Array.isArray(plans)) {
            setFeaturedPlans(plans);
          } else if (plans?.value && Array.isArray(plans.value)) {
            setFeaturedPlans(plans.value);
          }
        }

        const parseJson = async (response: Response) => {
          const text = await response.text();
          return text ? JSON.parse(text) : null;
        };

        if (featuredPricingResponse.ok) {
          const pricing = await parseJson(featuredPricingResponse);
          setFeaturedPricing(pricing);
          if (pricing?.basePriceUsdCents) {
            setFeaturedBasePriceUsd(pricing.basePriceUsdCents / 100);
          } else if (pricing?.priceCents) {
            setFeaturedBasePriceUsd(pricing.priceCents / 100);
          } else {
            // Default to $10/week if no pricing configured
            setFeaturedBasePriceUsd(10);
          }
        } else {
          // Set default pricing if endpoint fails
          setFeaturedBasePriceUsd(10);
        }

        if (enabledProvidersResponse.ok) {
          const providers = await parseJson(enabledProvidersResponse);
          setEnabledPaymentProviders(Array.isArray(providers) ? providers : []);
        }

        if (defaultProviderResponse.ok) {
          const provider = await parseJson(defaultProviderResponse);
          setDefaultPaymentProvider(provider ?? null);
        }

        // Handle verification costs
        if (verificationCostsResponse.ok) {
          const costs = await parseJson(verificationCostsResponse);
          setVerificationCosts(costs.value || costs);
        }
      } catch (err) {
        console.error("Failed to load pricing configs", err);
      }
    };

    fetchConfigs();
  }, [apiBaseUrl, session?.accessToken]);

  useEffect(() => {
    if (!property) return;
    const managementAssignments = (property as any)?.managementAssignments as
      | any[]
      | undefined;
    const latestManagement = managementAssignments?.[0];
    const nextManagedByType =
      latestManagement?.managedByType || property.managedByType || "OWNER";
    setManagedByType(nextManagedByType);

    if (nextManagedByType === "AGENT") {
      const managerId =
        latestManagement?.managedById ||
        property.managedById ||
        property.agentOwnerId ||
        null;
      setSelectedAgent(managerId);
      const existingAgent = agents?.find((a: any) => a.id === managerId);
      if (existingAgent?.name) {
        setAgentSearchQuery(existingAgent.name);
      }
    }

    if (nextManagedByType === "AGENCY") {
      const agencyId =
        latestManagement?.managedById ||
        property.managedById ||
        property.agencyId ||
        null;
      setSelectedAgencyId(agencyId);
      setSelectedOperatingAgentId(
        latestManagement?.assignedAgentId || property.assignedAgentId || null,
      );
    }
  }, [property?.id, property?.managedByType, agents]);

  useEffect(() => {
    if (session?.user?.role !== "COMPANY_ADMIN" || !myAgency) return;
    if (!selectedAgencyId) {
      setManagedByType("AGENCY");
      setSelectedAgencyId(myAgency.id);
      setAgencySearchQuery(myAgency.name ?? "");
    }
  }, [session?.user?.role, myAgency, selectedAgencyId]);

  useEffect(() => {
    if (!selectedAgent || serviceFee) return;
    const selectedAgentInfo =
      agentSearchResults.find((a: any) => a.id === selectedAgent) ||
      agents?.find((a: any) => a.id === selectedAgent);
    const trustScore = Number(selectedAgentInfo?.trustScore ?? 0);
    const matchingTier = agentFeeConfig.find(
      (tier) => trustScore >= tier.min && trustScore <= tier.max,
    );
    if (matchingTier) {
      setServiceFee(String(matchingTier.feeUsd));
    }
  }, [selectedAgent, agentSearchResults, agents, agentFeeConfig, serviceFee]);

  useEffect(() => {
    if (managedByType !== "AGENT") {
      setSelectedAgent(null);
      setAgentSearchQuery("");
    }
    if (managedByType !== "AGENCY") {
      setSelectedAgencyId(null);
      setAgencySearchQuery("");
      setSelectedOperatingAgentId(null);
    }
  }, [managedByType]);

  // Debounced agent search
  useEffect(() => {
    if (!sdk || managedByType !== "AGENT" || agentSearchQuery.length < 2) {
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

  useEffect(() => {
    if (!sdk || managedByType !== "AGENCY" || agencySearchQuery.length < 2) {
      setAgencySearchResults([]);
      setShowAgencyDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingAgencies(true);
      try {
        const results = await sdk.agencies.search(agencySearchQuery);
        setAgencySearchResults(results);
        setShowAgencyDropdown(true);
      } catch (error) {
        console.error("Agency search failed:", error);
        setAgencySearchResults([]);
      } finally {
        setIsSearchingAgencies(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [agencySearchQuery, sdk, managedByType]);

  const createManagementMutation = useMutation({
    mutationFn: async (payload: {
      managedByType: "OWNER" | "AGENT" | "AGENCY";
      managedById?: string;
      assignedAgentId?: string;
      serviceFeeUsd?: number;
    }) => sdk!.properties.createManagementAssignment(propertyId, payload),
    onSuccess: () => {
      notify.success("Management request sent");
      queryClient.invalidateQueries({ queryKey: ["property", propertyId] });
      setServiceFee("");
    },
    onError: (err: any) =>
      notify.error(err.message || "Failed to send management request"),
  });

  const acceptManagementMutation = useMutation({
    mutationFn: (assignmentId: string) =>
      sdk!.properties.acceptManagementAssignment(assignmentId),
    onSuccess: () => {
      notify.success("Management accepted");
      queryClient.invalidateQueries({ queryKey: ["property", propertyId] });
    },
    onError: (err: any) =>
      notify.error(err.message || "Failed to accept management"),
  });

  const declineManagementMutation = useMutation({
    mutationFn: (assignmentId: string) =>
      sdk!.properties.declineManagementAssignment(assignmentId),
    onSuccess: () => {
      notify.success("Management declined");
      queryClient.invalidateQueries({ queryKey: ["property", propertyId] });
    },
    onError: (err: any) =>
      notify.error(err.message || "Failed to decline management"),
  });

  const endManagementMutation = useMutation({
    mutationFn: (assignmentId: string) =>
      sdk!.properties.endManagementAssignment(assignmentId),
    onSuccess: () => {
      notify.success("Management ended");
      queryClient.invalidateQueries({ queryKey: ["property", propertyId] });
    },
    onError: (err: any) =>
      notify.error(err.message || "Failed to end management"),
  });

  const setOperatingAgentMutation = useMutation({
    mutationFn: (assignedAgentId: string | null) =>
      sdk!.properties.setOperatingAgent(propertyId, { assignedAgentId }),
    onSuccess: () => {
      notify.success("Operating agent updated");
      queryClient.invalidateQueries({ queryKey: ["property", propertyId] });
    },
    onError: (err: any) =>
      notify.error(err.message || "Failed to update operating agent"),
  });

  const resolvePaymentGateway = () => {
    if (enabledPaymentProviders.length === 0) {
      return null;
    }
    if (defaultPaymentProvider?.provider) {
      return defaultPaymentProvider.provider;
    }
    return enabledPaymentProviders[0]?.provider ?? null;
  };

  const handleAssign = () => {
    const fee = serviceFee ? Number(serviceFee) : undefined;
    if (managedByType === "AGENT") {
      if (!selectedAgent) return notify.error("Select an agent first");
      return createManagementMutation.mutate({
        managedByType,
        managedById: selectedAgent,
        assignedAgentId: selectedAgent,
        serviceFeeUsd: fee,
      });
    }

    if (managedByType === "AGENCY") {
      if (!selectedAgencyId) return notify.error("Select an agency first");
      return createManagementMutation.mutate({
        managedByType,
        managedById: selectedAgencyId,
        assignedAgentId: selectedOperatingAgentId ?? undefined,
        serviceFeeUsd: fee,
      });
    }

    return createManagementMutation.mutate({
      managedByType: "OWNER",
    });
  };

  const handlePurchaseFeatured = async () => {
    if (!selectedFeaturedPlan || !apiBaseUrl || !session?.accessToken) {
      return notify.error("Select a featured plan first");
    }

    const targetPropertyId = property?.id ?? propertyId;
    if (!targetPropertyId) {
      return notify.error("Listing details not ready yet");
    }

    const plan = featuredPlans.find((p) => p.id === selectedFeaturedPlan);
    if (!plan) return notify.error("Featured plan not found");

    setFeaturedProcessing(true);
    try {
      // Calculate fee: prefer plan.feeUsdCents, else calculate from base price
      let amountUsd: number;
      if (plan.feeUsdCents) {
        const discount = plan.discountPercent ?? 0;
        amountUsd = (plan.feeUsdCents / 100) * (1 - discount / 100);
      } else {
        const basePriceUsd = featuredBasePriceUsd ?? 10; // Default $10/week
        const discount = plan.discountPercent ?? 0;
        const discountedPrice = basePriceUsd * (1 - discount / 100);
        amountUsd = discountedPrice * (plan.durationDays / 7);
      }

      if (!amountUsd || amountUsd <= 0) {
        throw new Error(
          "Unable to calculate payment amount. Please contact support.",
        );
      }

      const gateway = resolvePaymentGateway();

      if (!gateway) {
        throw new Error(
          "No payment provider is enabled. Ask Admin to enable a provider.",
        );
      }

      const response = await fetch(
        `${apiBaseUrl}/properties/${targetPropertyId}/payments/invoices`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({
            type: "PROMOTION",
            amount: Number(amountUsd.toFixed(2)),
            currency: featuredPricing?.currency ?? "USD",
            description: `${plan.label} featured listing`,
            purpose: "BOOST",
            metadata: {
              planLabel: plan.label,
              planId: plan.id,
              durationDays: plan.durationDays,
            },
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error?.message || "Failed to create invoice");
      }

      const payment = await response.json();

      const intentResponse = await fetch(`${apiBaseUrl}/payments/intents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({
          invoiceId: payment?.invoice?.id ?? payment?.invoiceId,
          gateway,
          returnUrl: `${window.location.origin}/dashboard/listings/${targetPropertyId}`,
        }),
      });

      if (!intentResponse.ok) {
        const error = await intentResponse.json();
        throw new Error(error?.message || "Failed to start payment");
      }

      const intent = await intentResponse.json();
      if (intent.redirectUrl) {
        window.location.href = intent.redirectUrl;
      } else {
        notify.success("Invoice created. Complete payment in Payments tab.");
        queryClient.invalidateQueries({ queryKey: ["payments", propertyId] });
      }
    } catch (error: any) {
      notify.error(error?.message || "Failed to start featured payment");
    } finally {
      setFeaturedProcessing(false);
    }
  };

  if (!sdk || isLoading) return <Skeleton className="h-96 w-full" />;
  if (error || !property)
    return (
      <div className="text-red-500">
        {error instanceof Error ? error.message : "Failed to load property"}
      </div>
    );

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
            myAgency={myAgency}
            sessionRole={session?.user?.role}
            sessionUserId={session?.user?.id}
            managedByType={managedByType}
            setManagedByType={setManagedByType}
            selectedAgent={selectedAgent}
            setSelectedAgent={setSelectedAgent}
            agentSearchQuery={agentSearchQuery}
            setAgentSearchQuery={setAgentSearchQuery}
            agentSearchResults={agentSearchResults}
            isSearchingAgents={isSearchingAgents}
            showAgentDropdown={showAgentDropdown}
            setShowAgentDropdown={setShowAgentDropdown}
            agencySearchQuery={agencySearchQuery}
            setAgencySearchQuery={setAgencySearchQuery}
            agencySearchResults={agencySearchResults}
            isSearchingAgencies={isSearchingAgencies}
            showAgencyDropdown={showAgencyDropdown}
            setShowAgencyDropdown={setShowAgencyDropdown}
            selectedAgencyId={selectedAgencyId}
            setSelectedAgencyId={setSelectedAgencyId}
            agencyMembers={agencyMembers}
            selectedOperatingAgentId={selectedOperatingAgentId}
            setSelectedOperatingAgentId={setSelectedOperatingAgentId}
            serviceFee={serviceFee}
            setServiceFee={setServiceFee}
            handleAssign={handleAssign}
            isAssigning={createManagementMutation.isPending}
            onAcceptManagement={(id: string) =>
              acceptManagementMutation.mutate(id)
            }
            onDeclineManagement={(id: string) =>
              declineManagementMutation.mutate(id)
            }
            onEndManagement={(id: string) => endManagementMutation.mutate(id)}
            onSetOperatingAgent={(agentId: string | null) =>
              setOperatingAgentMutation.mutate(agentId)
            }
            isAccepting={acceptManagementMutation.isPending}
            isDeclining={declineManagementMutation.isPending}
            isEnding={endManagementMutation.isPending}
            isUpdatingOperatingAgent={setOperatingAgentMutation.isPending}
            agentFeeConfig={agentFeeConfig}
            featuredPlans={featuredPlans}
            selectedFeaturedPlan={selectedFeaturedPlan}
            setSelectedFeaturedPlan={setSelectedFeaturedPlan}
            featuredBasePriceUsd={featuredBasePriceUsd}
            featuredProcessing={featuredProcessing}
            handlePurchaseFeatured={handlePurchaseFeatured}
            propertyPayments={propertyPayments}
          />
        )}
        {activeTab === "interest" && <InterestTab propertyId={propertyId} />}
        {activeTab === "chats" && <ChatsTab propertyId={propertyId} />}
        {activeTab === "viewings" && <ViewingsTab propertyId={propertyId} />}
        {activeTab === "payments" && <PaymentsTab propertyId={propertyId} />}
        {activeTab === "verification" && (
          <VerificationTab
            propertyId={propertyId}
            verificationCosts={verificationCosts}
          />
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
  myAgency,
  sessionRole,
  sessionUserId,
  managedByType,
  setManagedByType,
  selectedAgent,
  setSelectedAgent,
  agentSearchQuery,
  setAgentSearchQuery,
  agentSearchResults,
  isSearchingAgents,
  showAgentDropdown,
  setShowAgentDropdown,
  agencySearchQuery,
  setAgencySearchQuery,
  agencySearchResults,
  isSearchingAgencies,
  showAgencyDropdown,
  setShowAgencyDropdown,
  selectedAgencyId,
  setSelectedAgencyId,
  agencyMembers,
  selectedOperatingAgentId,
  setSelectedOperatingAgentId,
  serviceFee,
  setServiceFee,
  handleAssign,
  isAssigning,
  onAcceptManagement,
  onDeclineManagement,
  onEndManagement,
  onSetOperatingAgent,
  isAccepting,
  isDeclining,
  isEnding,
  isUpdatingOperatingAgent,
  agentFeeConfig,
  featuredPlans,
  selectedFeaturedPlan,
  setSelectedFeaturedPlan,
  featuredBasePriceUsd,
  featuredProcessing,
  handlePurchaseFeatured,
  propertyPayments,
}: any) {
  const managementAssignments = (property as any)?.managementAssignments as
    | any[]
    | undefined;
  const latestManagement = managementAssignments?.[0];
  const assignmentStatus = latestManagement?.status;
  const isAccepted = assignmentStatus === "ACCEPTED";
  const isPending = assignmentStatus === "CREATED";
  const [isRequestingChange, setIsRequestingChange] = useState(false);
  const ownerId = (property as any)?.ownerId ?? property?.landlordId ?? null;
  const canRequestManagement =
    sessionRole === "ADMIN" || (ownerId && ownerId === sessionUserId);
  const managerType = latestManagement?.managedByType || managedByType;

  const selectedAgentData =
    agentSearchResults.find((a: any) => a.id === selectedAgent) ||
    agents?.find((a: any) => a.id === selectedAgent);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const agencyDropdownRef = useRef<HTMLDivElement>(null);

  const trustScore = Number(selectedAgentData?.trustScore ?? 0);
  const feeTier = (agentFeeConfig || []).find(
    (tier: { min: number; max: number; feeUsd: number; label?: string }) =>
      trustScore >= tier.min && trustScore <= tier.max,
  );
  const feeLabel = feeTier
    ? `${feeTier.label ?? "Recommended"} • ${feeTier.feeUsd} USD`
    : null;

  const handleAgentSelect = (agent: any) => {
    setSelectedAgent(agent.id);
    setAgentSearchQuery(agent.name || "");
    setShowAgentDropdown(false);
  };

  const handleAgencySelect = (agency: any) => {
    setSelectedAgencyId(agency.id);
    setAgencySearchQuery(agency.name || "");
    setShowAgencyDropdown(false);
  };

  const agentOptions = (agencyMembers || [])
    .filter((member: any) => member.role === "AGENT")
    .map((member: any) => member.user)
    .filter(Boolean);

  const canAccept =
    isPending &&
    (sessionRole === "ADMIN" ||
      (latestManagement?.managedByType === "AGENT" &&
        latestManagement?.managedById === sessionUserId) ||
      (latestManagement?.managedByType === "AGENCY" &&
        latestManagement?.managedById === myAgency?.id &&
        sessionRole === "COMPANY_ADMIN"));
  const canRequestChange = isAccepted && canRequestManagement;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowAgentDropdown(false);
      }
      if (
        agencyDropdownRef.current &&
        !agencyDropdownRef.current.contains(event.target as Node)
      ) {
        setShowAgencyDropdown(false);
      }
    };
    if (showAgentDropdown || showAgencyDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showAgentDropdown, showAgencyDropdown]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Listing Management</CardTitle>
          <p className="text-xs text-neutral-500">
            Pick who manages the listing, then choose the operating agent.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAccepted && !isRequestingChange && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              <p className="font-semibold">Management Active</p>
              <p className="text-xs text-emerald-700">
                Manager: {managerType}
                {latestManagement?.managedByType === "AGENT" &&
                  latestManagement?.managedById &&
                  ` • Agent ${latestManagement.managedById}`}
                {latestManagement?.managedByType === "AGENCY" &&
                  latestManagement?.managedById &&
                  ` • Agency ${latestManagement.managedById}`}
              </p>
            </div>
          )}

          {isPending && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-semibold">Management Pending</p>
              <p className="text-xs text-amber-700">
                Waiting for acceptance from the manager.
              </p>
              {canAccept && (
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => onAcceptManagement(latestManagement.id)}
                    disabled={isAccepting}
                  >
                    {isAccepting ? "Accepting..." : "Accept"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDeclineManagement(latestManagement.id)}
                    disabled={isDeclining}
                  >
                    {isDeclining ? "Declining..." : "Decline"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {!isAccepted && !isPending && !canRequestManagement && (
            <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600">
              Only the listing owner can request management changes.
            </div>
          )}

          {(!isAccepted || isRequestingChange) &&
            !isPending &&
            canRequestManagement && (
              <>
                {isRequestingChange && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    You are preparing a management change request. The current
                    manager remains active until the new request is accepted.
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Step 1: Choose listing manager</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={
                        managedByType === "OWNER" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setManagedByType("OWNER")}
                    >
                      Self-managed
                    </Button>
                    <Button
                      type="button"
                      variant={
                        managedByType === "AGENT" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setManagedByType("AGENT")}
                    >
                      Individual Agent
                    </Button>
                    <Button
                      type="button"
                      variant={
                        managedByType === "AGENCY" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setManagedByType("AGENCY")}
                    >
                      Agency
                    </Button>
                  </div>
                </div>

                {managedByType === "AGENT" && (
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
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {managedByType === "AGENCY" && (
                  <div className="space-y-2 relative">
                    <Label>Search Agency</Label>
                    {sessionRole === "COMPANY_ADMIN" && myAgency ? (
                      <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm">
                        {myAgency.name}
                      </div>
                    ) : (
                      <div className="relative" ref={agencyDropdownRef}>
                        <Input
                          type="text"
                          placeholder="Type agency name to search..."
                          value={agencySearchQuery}
                          onChange={(e) => {
                            setAgencySearchQuery(e.target.value);
                            if (e.target.value.length < 2) {
                              setSelectedAgencyId(null);
                              setShowAgencyDropdown(false);
                            } else {
                              setShowAgencyDropdown(true);
                            }
                          }}
                          onFocus={() => {
                            if (agencySearchResults.length > 0) {
                              setShowAgencyDropdown(true);
                            }
                          }}
                          className="w-full"
                        />
                        {isSearchingAgencies && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
                          </div>
                        )}
                        {showAgencyDropdown &&
                          agencySearchResults.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-200 rounded-md shadow-lg max-h-60 overflow-auto">
                              {agencySearchResults.map((agency: any) => (
                                <div
                                  key={agency.id}
                                  onClick={() => handleAgencySelect(agency)}
                                  className="px-4 py-2 hover:bg-neutral-50 cursor-pointer border-b last:border-0"
                                >
                                  <div className="font-medium">
                                    {agency.name}
                                  </div>
                                  <div className="text-xs text-neutral-500">
                                    {agency.status}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Step 2: Operating agent</Label>
                  {managedByType === "AGENCY" ? (
                    <select
                      className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                      value={selectedOperatingAgentId || ""}
                      onChange={(e) =>
                        setSelectedOperatingAgentId(
                          e.target.value ? e.target.value : null,
                        )
                      }
                    >
                      <option value="">Select agent (optional)</option>
                      {agentOptions.map((agent: any) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name || "Unnamed Agent"}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
                      {managedByType === "AGENT"
                        ? "Operating agent is the selected manager."
                        : "Owner-managed. You can delegate an operating agent later."}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Service Fee (USD)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 50"
                    value={serviceFee}
                    onChange={(e) => setServiceFee(e.target.value)}
                  />
                  {feeLabel && managedByType === "AGENT" && (
                    <p className="text-xs text-neutral-500">
                      Suggested fee: {feeLabel}
                    </p>
                  )}
                </div>

                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600">
                  <p className="font-medium text-neutral-700">Fee routing</p>
                  <p>
                    Agent-managed listings pay the fee to the agent.
                    Agency-managed listings pay the fee to the agency. Internal
                    agency assignments do not create platform fees.
                  </p>
                </div>

                <Button
                  onClick={handleAssign}
                  disabled={
                    isAssigning ||
                    (managedByType === "AGENT" && !selectedAgent) ||
                    (managedByType === "AGENCY" && !selectedAgencyId)
                  }
                  className="w-full"
                >
                  {isAssigning ? "Sending..." : "Send Management Request"}
                </Button>
              </>
            )}

          {isAccepted && !isRequestingChange && (
            <div className="space-y-3">
              {managerType === "AGENCY" && (
                <div className="space-y-2">
                  <Label>Operating agent</Label>
                  <select
                    className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                    value={(property as any).assignedAgentId || ""}
                    onChange={(e) =>
                      onSetOperatingAgent(
                        e.target.value ? e.target.value : null,
                      )
                    }
                    disabled={isUpdatingOperatingAgent}
                  >
                    <option value="">Unassigned</option>
                    {agentOptions.map((agent: any) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name || "Unnamed Agent"}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={isEnding}
                  onClick={() => onEndManagement(latestManagement.id)}
                >
                  {isEnding ? "Ending..." : "End management"}
                </Button>
                <Button
                  variant="ghost"
                  disabled={!canRequestChange}
                  onClick={() => {
                    setManagedByType("OWNER");
                    setSelectedAgent(null);
                    setSelectedAgencyId(null);
                    setSelectedOperatingAgentId(null);
                    setIsRequestingChange(true);
                  }}
                >
                  Request change
                </Button>
              </div>
              <p className="text-xs text-neutral-500">
                Use Request change to send a new management proposal. Accepting
                a new manager automatically ends the current one.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <FeaturedSection
        propertyId={property.id}
        plans={featuredPlans}
        selectedPlan={selectedFeaturedPlan}
        onSelectPlan={setSelectedFeaturedPlan}
        basePriceUsd={featuredBasePriceUsd}
        isProcessing={featuredProcessing}
        onPurchase={handlePurchaseFeatured}
        payments={propertyPayments}
      />
    </div>
  );
}

function FeaturedSection({
  propertyId,
  plans,
  selectedPlan,
  onSelectPlan,
  basePriceUsd,
  isProcessing,
  onPurchase,
  payments,
}: {
  propertyId: string;
  plans: Array<{
    id: string;
    label: string;
    durationDays: number;
    discountPercent?: number;
    feeUsdCents?: number;
    description?: string;
  }>;
  selectedPlan: string | null;
  onSelectPlan: (value: string) => void;
  basePriceUsd: number | null;
  isProcessing: boolean;
  onPurchase: () => void;
  payments?: any[];
}) {
  void propertyId;
  const basePriceLabel = basePriceUsd ? `$${basePriceUsd.toFixed(2)}/week` : "";

  // Find active boost from PAID PROMOTION payments
  const activeBoost = useMemo(() => {
    if (!payments) return null;

    const promotionPayments = payments.filter(
      (p: any) => p.type === "PROMOTION" && p.status === "PAID",
    );

    for (const payment of promotionPayments) {
      const metadata = payment.metadata as any;
      const durationDays = metadata?.durationDays || 30;
      const paidAt = new Date(payment.updatedAt);
      const expiresAt = new Date(
        paidAt.getTime() + durationDays * 24 * 60 * 60 * 1000,
      );

      if (expiresAt > new Date()) {
        return {
          planLabel: metadata?.planLabel || "Featured Listing",
          startedAt: paidAt,
          expiresAt,
          durationDays,
          amountPaid: payment.amountCents / 100,
        };
      }
    }

    return null;
  }, [payments]);

  // Calculate remaining time
  const remainingTime = useMemo(() => {
    if (!activeBoost) return null;
    const now = new Date();
    const diffMs = activeBoost.expiresAt.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(
      (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );

    if (diffDays > 0) return `${diffDays} days, ${diffHours} hours`;
    if (diffHours > 0) return `${diffHours} hours`;
    return "Less than 1 hour";
  }, [activeBoost]);

  // Show active boost details if present
  if (activeBoost) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            Featured Listing Active
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-emerald-800">
                {activeBoost.planLabel}
              </span>
              <span className="text-xs bg-emerald-600 text-white px-2 py-1 rounded-full">
                Active
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-neutral-500">Started</p>
                <p className="font-medium">
                  {activeBoost.startedAt.toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-neutral-500">Expires</p>
                <p className="font-medium">
                  {activeBoost.expiresAt.toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-neutral-500">Time Remaining</p>
                <p className="font-medium text-emerald-600">{remainingTime}</p>
              </div>
              <div>
                <p className="text-neutral-500">Amount Paid</p>
                <p className="font-medium">
                  ${activeBoost.amountPaid.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="text-xs text-neutral-500">
            <p>
              Your listing is currently boosted and will appear in featured
              sections. You can purchase another plan before this one expires to
              extend your boost.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show plan selection if no active boost
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-purple-600" />
          Featured Listing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-neutral-600 space-y-1">
          <p>
            Choose a featured plan. Longer plans include discounts, and unused
            time can be applied to future listings if the property is acquired.
          </p>
          {basePriceLabel && (
            <p className="text-xs text-neutral-500">
              Base price: {basePriceLabel}
            </p>
          )}
          {plans.length === 0 && (
            <p className="text-xs text-amber-600">
              No featured plans yet. Ask Admin to configure
              pricing.featuredPlans.
            </p>
          )}
        </div>
        {!plans.length && (
          <div className="rounded-lg border border-dashed border-neutral-200 p-3 text-xs text-neutral-500">
            Featured pricing will activate once plans are configured.
          </div>
        )}

        <div className="space-y-2">
          {plans.length === 0 ? (
            <p className="text-xs text-neutral-500">
              Plans are managed by Admin. Contact support if unavailable.
            </p>
          ) : (
            plans.map((plan) => {
              const isActive = selectedPlan === plan.id;
              const discount = plan.discountPercent ?? 0;
              // Calculate fee: use plan's feeUsdCents if available, else calculate from base
              let displayFee = "";
              if (plan.feeUsdCents) {
                const baseFee = plan.feeUsdCents / 100;
                const discountedFee = baseFee * (1 - discount / 100);
                displayFee = `$${discountedFee.toFixed(2)}`;
              } else if (basePriceUsd) {
                const perWeekFee = basePriceUsd * (plan.durationDays / 7);
                const discountedFee = perWeekFee * (1 - discount / 100);
                displayFee = `$${discountedFee.toFixed(2)}`;
              }
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => onSelectPlan(plan.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    isActive
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-neutral-200 hover:border-neutral-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-neutral-800">
                      {plan.label}
                    </span>
                    <div className="flex items-center gap-2">
                      {displayFee && (
                        <span className="text-xs font-semibold text-neutral-700">
                          {displayFee}
                        </span>
                      )}
                      {discount > 0 && (
                        <span className="text-xs text-emerald-600">
                          Save {discount}%
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-neutral-500">
                    {plan.description ||
                      `${plan.durationDays} days featured placement`}
                  </p>
                </button>
              );
            })
          )}
        </div>
        <PaymentGate
          featureType={ChargeableItemType.BOOST}
          targetId={propertyId}
          featureName="Featured Listing"
          featureDescription="Boost your listing visibility"
        >
          <Button
            onClick={onPurchase}
            disabled={!selectedPlan || isProcessing}
            className="w-full"
          >
            {isProcessing ? "Processing..." : "Select & Pay"}
          </Button>
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

  const { data: conversationChats } = useQuery<{ items: any[] }>({
    queryKey: ["conversation-listing-chats", propertyId],
    queryFn: async () => {
      const response = await fetch(
        `/api/messages/listing?propertyId=${encodeURIComponent(propertyId)}`,
      );
      if (!response.ok) return { items: [] };
      return (await response.json()) as { items: any[] };
    },
    refetchInterval: 10000,
    initialData: { items: [] },
  });

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
    <div className="space-y-4">
      {(conversationChats?.items ?? []).length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Messenger listing chats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(conversationChats?.items ?? []).map((conversation: any) => (
              <Link
                key={conversation.id}
                href={`/dashboard/messages/${conversation.id}`}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:border-emerald-300"
              >
                <span className="font-medium text-foreground">
                  {conversation.property?.title || "Listing conversation"}
                </span>
                <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Listing chat
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

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

function VerificationTab({
  propertyId,
  verificationCosts,
}: {
  propertyId: string;
  verificationCosts?: any;
}) {
  const sdk = useAuthenticatedSDK();
  const queryClient = useQueryClient();

  const {
    data: verificationRequest,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["verification-request", propertyId],
    queryFn: async () => sdk!.properties.getVerificationRequest(propertyId),
    enabled: !!sdk,
    retry: 1,
    initialData: null as any,
  });

  const { data: payments } = useQuery({
    queryKey: ["payments", propertyId],
    queryFn: async () => sdk!.properties.getPayments(propertyId),
    enabled: !!sdk,
    initialData: [] as any[],
  });

  const verificationPayment = payments?.find(
    (p: any) => p.type === "VERIFICATION" && p.status === "PENDING",
  );
  const verifiedForFree =
    verificationPayment && verificationPayment.amountCents === 0;

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

  const refreshVerification = useMutation({
    mutationFn: () => sdk!.properties.refreshVerification(propertyId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["verification-request", propertyId],
      });
    },
  });

  const updateItemMut = useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: any }) =>
      sdk!.properties.updateVerificationItem(propertyId, itemId, payload),
    onSuccess: () => {
      notify.success("Verification item updated");
      queryClient.invalidateQueries({
        queryKey: ["verification-request", propertyId],
      });
      refreshVerification.mutate();
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

  const overallStatus = verificationRequest?.status || "NONE";
  const verificationLevel =
    verificationRequest?.property?.verificationLevel || "NONE";
  const verificationScore =
    verificationRequest?.property?.verificationScore || 0;
  const items = verificationRequest?.items || [];
  const proofItem = items.find((i: any) => i.type === "PROOF_OF_OWNERSHIP");
  const locationItem = items.find(
    (i: any) => i.type === "LOCATION_CONFIRMATION",
  );
  const photosItem = items.find((i: any) => i.type === "PROPERTY_PHOTOS");

  // Calculate dynamic verification status for the heading
  const approvedItems = items.filter(
    (i: any) => i.status === "APPROVED",
  ).length;
  const totalItems = items.length;
  const getVerificationStatusLabel = () => {
    if (approvedItems === 0) return "Verification Pending";
    if (approvedItems > 0 && approvedItems < totalItems)
      return "Partially Verified";
    if (approvedItems === totalItems && totalItems > 0) return "Verified";
    return "Verification Pending";
  };
  const verificationStatusLabel = getVerificationStatusLabel();

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
      {verificationRequest &&
        verificationPayment &&
        verificationPayment.status === "PENDING" &&
        items.some((i: any) => i.status === "SUBMITTED") && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <div className="flex-1">
                  <p className="font-medium text-amber-900">
                    Verification payment required
                  </p>
                  <p className="text-sm text-amber-700">
                    You have submitted verification items. Please complete
                    payment to proceed.
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
      {verifiedForFree && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <div className="flex-1">
                <p className="font-medium text-emerald-900">
                  Verification fee waived
                </p>
                <p className="text-sm text-emerald-700">
                  Admin has written off the verification payment for this
                  listing.
                </p>
              </div>
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
                verificationLevel === "VERIFIED"
                  ? "bg-emerald-100 text-emerald-600"
                  : overallStatus === "PENDING"
                    ? "bg-yellow-100 text-yellow-600"
                    : overallStatus === "REJECTED"
                      ? "bg-red-100 text-red-600"
                      : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {verificationLevel === "VERIFIED" ? (
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
                    {verificationStatusLabel}
                  </h3>
                  <p className="text-sm text-neutral-500 mb-2">
                    {approvedItems === 0
                      ? overallStatus === "PENDING"
                        ? "Our team is reviewing your documentation."
                        : "Complete all steps below to request verification."
                      : approvedItems === totalItems && totalItems > 0
                        ? "All verification items have been approved."
                        : `${approvedItems} of ${totalItems} verification items approved.`}
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
                    {verificationScore} / 110+ Points
                  </span>
                </div>
                <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{
                      width: `${Math.min((verificationScore / 110) * 100, 100)}%`,
                    }}
                  />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-neutral-500">
                    Complete more verifications to increase listing trust and
                    visibility.
                  </span>
                  {verificationLevel !== "NONE" && (
                    <span className="text-xs font-semibold text-emerald-600">
                      {verificationLevel === "BASIC"
                        ? "Bronze Badge"
                        : verificationLevel === "TRUSTED"
                          ? "Silver Badge"
                          : "Gold Badge"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification Steps */}
      <div className="space-y-4">
        {!verificationRequest && (
          <Card>
            <CardContent className="p-6 text-sm text-neutral-500">
              No verification request yet. Submit documents below to start.
            </CardContent>
          </Card>
        )}
        {/* Step 1: Proof of Ownership */}
        <VerificationStep
          title="Proof of Ownership"
          description="Upload title deed or utility bill (Max 5 files)"
          icon={<FileText className="h-5 w-5" />}
          item={proofItem}
          statusBadge={getStatusBadge(proofItem?.status || "PENDING")}
          isDisabled={checkIsLocked(proofItem)}
          cost={verificationCosts?.PROOF_OF_OWNERSHIP}
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
          cost={verificationCosts?.LOCATION_CONFIRMATION}
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
          cost={verificationCosts?.PROPERTY_PHOTOS}
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
  cost,
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
  cost?: number;
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
  // Track if local changes have been made that shouldn't be overwritten by item sync
  const [hasLocalChanges, setHasLocalChanges] = useState(false);

  // Sync with item when it changes - but only if no local changes pending
  useEffect(() => {
    if (item && !hasLocalChanges) {
      setEvidenceUrls(item.evidenceUrls || []);
      setGpsLat(item.gpsLat || undefined);
      setGpsLng(item.gpsLng || undefined);
      setRequestOnSiteVisit(!!item.notes?.includes("On-site visit"));
    }
  }, [item, hasLocalChanges]);

  // Reset hasLocalChanges when item status changes (meaning server processed our update)
  useEffect(() => {
    if (item?.status) {
      setHasLocalChanges(false);
    }
  }, [item?.status, item?.updatedAt]);

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
        setHasLocalChanges(true);
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
    setHasLocalChanges(true);
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
          <div className="flex items-center gap-2">
            {cost !== undefined && cost > 0 && (
              <span className="text-xs font-medium text-neutral-500 bg-neutral-100 px-2 py-1 rounded">
                US${cost}
              </span>
            )}
            {statusBadge}
          </div>
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

        {evidenceUrls.length > 0 && (
          <div className="mb-4 grid grid-cols-2 md:grid-cols-3 gap-3">
            {evidenceUrls.map((url, idx) => {
              const resolved = getImageUrl(url);
              const isDoc =
                resolved.endsWith(".pdf") ||
                resolved.includes(".pdf") ||
                resolved.includes(".doc");
              return (
                <div
                  key={idx}
                  className="relative aspect-video bg-neutral-100 rounded overflow-hidden group border"
                >
                  {isDoc ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                      <FileText className="h-8 w-8 text-neutral-400 mb-1" />
                      <span className="text-[10px] text-neutral-500 truncate w-full px-1">
                        {resolved.split("/").pop()}
                      </span>
                      <a
                        href={resolved}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-blue-500 hover:underline mt-1"
                      >
                        View
                      </a>
                    </div>
                  ) : (
                    <a
                      href={resolved}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full h-full"
                    >
                      <img
                        src={resolved}
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
              );
            })}
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
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const apiBaseUrl = getPublicApiBaseUrl();

  const [offlineMethod, setOfflineMethod] = useState("Bank Transfer");
  const [offlineAmount, setOfflineAmount] = useState("");
  const [offlineCurrency, setOfflineCurrency] = useState("USD");
  const [offlineReference, setOfflineReference] = useState("");
  const [offlineNotes, setOfflineNotes] = useState("");
  const [offlinePaidAt, setOfflinePaidAt] = useState("");
  const [offlineProofUrl, setOfflineProofUrl] = useState<string | null>(null);
  const [offlineUploading, setOfflineUploading] = useState(false);

  const [invoiceType, setInvoiceType] = useState("PROMOTION");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceCurrency, setInvoiceCurrency] = useState("USD");
  const [invoiceDescription, setInvoiceDescription] = useState("");

  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const isAdmin = session?.user?.role === "ADMIN";

  const handleApprovePayment = async (paymentId: string) => {
    try {
      if (!session?.accessToken || !apiBaseUrl) return;

      const response = await fetch(
        `${apiBaseUrl}/properties/${propertyId}/payments/offline/${paymentId}/approve`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error?.message || "Failed to approve payment");
      }

      notify.success("Payment approved successfully");
      queryClient.invalidateQueries({ queryKey: ["payments", propertyId] });
      queryClient.invalidateQueries({ queryKey: ["property", propertyId] });
    } catch (err: any) {
      notify.error(err?.message || "Failed to approve payment");
    }
  };

  const handleBulkApprove = async () => {
    // Optimistic loop for now
    let successCount = 0;
    for (const id of selectedPayments) {
      // Only approve pending ones? We can try all selected.
      try {
        await handleApprovePayment(id);
        successCount++;
      } catch (e) {
        console.error(e);
      }
    }
    if (successCount > 0) {
      notify.success(`Approved ${successCount} payments`);
      setSelectedPayments([]);
    }
  };

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
      case "ASSIGNMENT_FEE":
        return metadata?.managedByType === "AGENCY"
          ? "Agency Assignment Fee"
          : "Agent Assignment Fee";
      case "PROMOTION":
        return metadata?.planLabel
          ? `${metadata.planLabel} Featured Listing`
          : "Featured Listing Boost";
      case "FEATURED":
        return metadata?.planLabel
          ? `${metadata.planLabel} Featured Listing`
          : "Featured Listing";
      case "VERIFICATION": {
        const itemType = metadata?.itemType;
        if (itemType) {
          const labels: Record<string, string> = {
            PROOF_OF_OWNERSHIP: "Proof of Ownership",
            LOCATION_CONFIRMATION: "Location Confirmation",
            PROPERTY_PHOTOS: "Property Photos",
          };
          return `Verification - ${labels[itemType] || itemType}`;
        }
        return "Property Verification";
      }
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

  const handleOfflineProofUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !sdk) return;
    setOfflineUploading(true);
    try {
      const result = await sdk.properties.uploadMedia(propertyId, files[0]);
      setOfflineProofUrl(result.url);
      notify.success("Proof uploaded");
    } catch (err) {
      notify.error("Failed to upload proof");
    } finally {
      setOfflineUploading(false);
    }
  };

  const submitOfflinePayment = async () => {
    if (!sdk) return;
    const amount = Number(offlineAmount);
    if (!amount || amount <= 0) {
      return notify.error("Enter a valid amount");
    }
    try {
      await sdk.properties.createOfflinePayment(propertyId, {
        amount,
        currency: offlineCurrency as "USD" | "ZWG",
        method: offlineMethod,
        reference: offlineReference || undefined,
        proofUrl: offlineProofUrl || undefined,
        notes: offlineNotes || undefined,
        paidAt: offlinePaidAt || undefined,
      });
      notify.success("Offline payment submitted");
      setOfflineAmount("");
      setOfflineReference("");
      setOfflineNotes("");
      setOfflinePaidAt("");
      setOfflineProofUrl(null);
      queryClient.invalidateQueries({ queryKey: ["payments", propertyId] });
    } catch (err: any) {
      notify.error(err?.message || "Failed to submit offline payment");
    }
  };

  const fetchPaymentIntent = async (payment: any) => {
    if (!apiBaseUrl || !session?.accessToken || !payment?.invoice?.id) {
      return null;
    }

    const gateway = payment.invoice?.paymentIntents?.[0]?.gateway ?? "PAYNOW";

    const intentResponse = await fetch(`${apiBaseUrl}/payments/intents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({
        invoiceId: payment.invoice.id,
        gateway,
        returnUrl: `${window.location.origin}/dashboard/listings/${propertyId}`,
      }),
    });

    if (!intentResponse.ok) {
      const error = await intentResponse.json();
      throw new Error(error?.message || "Failed to create payment intent");
    }

    const intent = await intentResponse.json();
    return intent;
  };

  const createInvoice = async () => {
    if (!sdk) return;
    const amount = Number(invoiceAmount);
    if (!amount || amount <= 0) {
      return notify.error("Enter a valid invoice amount");
    }
    try {
      await sdk.properties.createListingInvoice(propertyId, {
        type: invoiceType as any,
        amount,
        currency: invoiceCurrency as "USD" | "ZWG",
        description: invoiceDescription || undefined,
        purpose: invoiceType === "VERIFICATION" ? "VERIFICATION" : "BOOST",
      });
      notify.success("Invoice created");
      setInvoiceAmount("");
      setInvoiceDescription("");
      queryClient.invalidateQueries({ queryKey: ["payments", propertyId] });
    } catch (err: any) {
      notify.error(err?.message || "Failed to create invoice");
    }
  };

  if (isLoading) return <Skeleton className="h-64" />;
  if (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to load payments";
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
                const hasRedirectUrl =
                  isPending &&
                  payment.invoice?.paymentIntents?.[0]?.redirectUrl;
                const amount = payment.amountCents / 100;
                const formattedAmount = formatCurrency(
                  amount,
                  payment.currency as any,
                );

                const isSelected = selectedPayments.includes(payment.id);

                return (
                  <div
                    key={payment.id}
                    className={`flex justify-between items-start p-4 border rounded-lg transition-colors ${isSelected ? "bg-blue-50 border-blue-200" : "hover:bg-neutral-50"}`}
                  >
                    <div className="flex gap-3 items-start flex-1 min-w-0">
                      <div className="pt-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPayments([
                                ...selectedPayments,
                                payment.id,
                              ]);
                            } else {
                              setSelectedPayments(
                                selectedPayments.filter(
                                  (id) => id !== payment.id,
                                ),
                              );
                            }
                          }}
                          className="rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer h-4 w-4"
                        />
                      </div>
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
                        {payment.invoice?.invoiceNo && (
                          <p className="text-xs text-neutral-400">
                            Invoice: {payment.invoice.invoiceNo}
                          </p>
                        )}
                        {payment.metadata?.notes && (
                          <p className="text-xs text-neutral-500 mt-1">
                            Note: {payment.metadata.notes}
                          </p>
                        )}
                        {(payment.metadata?.proofUrl ||
                          payment.metadata?.method) && (
                          <div className="flex gap-2 text-xs text-neutral-400 mt-1">
                            {payment.metadata.method && (
                              <span>via {payment.metadata.method}</span>
                            )}
                            {payment.metadata.proofUrl && (
                              <a
                                href={getImageUrl(payment.metadata.proofUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline"
                              >
                                View Proof
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 ml-4">
                      <div className="text-right">
                        <p className="font-bold text-lg text-neutral-900">
                          {formattedAmount}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        {isPending && isAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApprovePayment(payment.id)}
                            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                          >
                            Approve
                          </Button>
                        )}
                        {payment.invoice?.pdfUrl && (
                          <a
                            href={payment.invoice.pdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-emerald-600 hover:underline block"
                          >
                            Invoice PDF
                          </a>
                        )}
                        {hasRedirectUrl ? (
                          <Button
                            size="sm"
                            onClick={() => handlePayNow(payment)}
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            Pay Now
                          </Button>
                        ) : (
                          isPending &&
                          payment.invoice?.id &&
                          !isAdmin && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                try {
                                  const intent =
                                    await fetchPaymentIntent(payment);
                                  if (intent?.redirectUrl) {
                                    window.location.href = intent.redirectUrl;
                                  }
                                } catch (err: any) {
                                  notify.error(
                                    err?.message || "Failed to prepare payment",
                                  );
                                }
                              }}
                            >
                              Generate Pay Link
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {selectedPayments.length > 0 && isAdmin && (
                <div className="mt-4 p-4 border-t bg-emerald-50 flex justify-between items-center rounded-b-lg">
                  <span className="text-sm font-medium text-emerald-800">
                    {selectedPayments.length} payments selected
                  </span>
                  <Button
                    onClick={handleBulkApprove}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    Approve Selected
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Offline Payment Proof
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Input
                value={offlineMethod}
                onChange={(e) => setOfflineMethod(e.target.value)}
                placeholder="Bank Transfer / Cash"
              />
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                value={offlineAmount}
                onChange={(e) => setOfflineAmount(e.target.value)}
                placeholder="e.g. 50"
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input
                value={offlineCurrency}
                onChange={(e) => setOfflineCurrency(e.target.value)}
                placeholder="USD"
              />
            </div>
            <div className="space-y-2">
              <Label>Reference</Label>
              <Input
                value={offlineReference}
                onChange={(e) => setOfflineReference(e.target.value)}
                placeholder="Bank ref or receipt number"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Payment Date</Label>
            <Input
              type="date"
              value={offlinePaidAt}
              onChange={(e) => setOfflinePaidAt(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={offlineNotes}
              onChange={(e) => setOfflineNotes(e.target.value)}
              placeholder="Add optional notes"
            />
          </div>
          <div className="space-y-2">
            <Label>Proof of Payment</Label>
            <input
              type="file"
              onChange={(e) => handleOfflineProofUpload(e.target.files)}
              disabled={offlineUploading}
              className="block w-full text-sm text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 disabled:opacity-50"
            />
            {offlineProofUrl && (
              <p className="text-xs text-neutral-500">Proof uploaded.</p>
            )}
          </div>
          <Button onClick={submitOfflinePayment} disabled={offlineUploading}>
            Submit Offline Payment
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Request Invoice
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Payment Type</Label>
              <Input
                value={invoiceType}
                onChange={(e) => setInvoiceType(e.target.value)}
                placeholder="PROMOTION / VERIFICATION / AGENT_FEE"
              />
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(e.target.value)}
                placeholder="e.g. 75"
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input
                value={invoiceCurrency}
                onChange={(e) => setInvoiceCurrency(e.target.value)}
                placeholder="USD"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={invoiceDescription}
                onChange={(e) => setInvoiceDescription(e.target.value)}
                placeholder="Invoice description"
              />
            </div>
          </div>
          <Button onClick={createInvoice}>Create Invoice</Button>
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
    const action = (metadata as any)?.action;
    if (action === "management_requested") return "Management Requested";
    if (action === "management_accepted") return "Management Accepted";
    if (action === "management_declined") return "Management Declined";
    if (action === "management_ended") return "Management Ended";
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
      case "MANAGEMENT_REQUESTED":
        return "Management Requested";
      case "MANAGEMENT_ACCEPTED":
        return "Management Accepted";
      case "MANAGEMENT_DECLINED":
        return "Management Declined";
      case "MANAGEMENT_ENDED":
        return "Management Ended";
      case "AGENT_UNASSIGNED":
        return "Agent Unassigned";
      case "PAYMENT_CREATED":
        return "Payment Created";
      case "PAYMENT_ASSIGNMENT_FEE_CREATED":
        return "Assignment Fee Created";
      case "MANAGEMENT_REQUESTED":
        return "Management Requested";
      case "MANAGEMENT_ACCEPTED":
        return "Management Accepted";
      case "MANAGEMENT_DECLINED":
        return "Management Declined";
      case "MANAGEMENT_ENDED":
        return "Management Ended";
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
