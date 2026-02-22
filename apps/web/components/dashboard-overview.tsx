"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { io } from "socket.io-client";
import {
  Building2,
  MapPin,
  MousePointerClick,
  TrendingUp,
  Users,
  X,
  LayoutDashboard,
  Wallet2,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from "@propad/ui";
import {
  useOverviewMetrics,
  useDailyAds,
  useTopAgents,
  useGeoListings,
} from "@/hooks/use-admin-metrics";
import { useDashboardMetrics } from "@/hooks/use-dashboard-metrics";
import { useAdvertiser } from "@/hooks/use-advertiser";
import { getPublicApiBaseUrl } from "@/lib/api-base-url";
import type {
  AdminOverviewMetrics,
  DailyAdsPoint,
  TopAgentPerformance,
  Role,
} from "@propad/sdk";

const RANGE_OPTIONS = [7, 30, 90] as const;
const CITY_CHOICES = ["Harare", "Bulawayo", "Mutare"];

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const numberFormatter = new Intl.NumberFormat("en-US");

type RangeOption = (typeof RANGE_OPTIONS)[number];

type DateFormatPattern = "yyyy-MM-dd" | "MMM d" | "MMM d, yyyy";

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});
const longDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function parseISO(value: string) {
  return new Date(value);
}

function isValid(date: Date) {
  return !Number.isNaN(date.getTime());
}

function subDays(date: Date, amount: number) {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() - amount);
  return result;
}

function differenceInCalendarDays(left: Date, right: Date) {
  const startLeft = Date.UTC(
    left.getFullYear(),
    left.getMonth(),
    left.getDate(),
  );
  const startRight = Date.UTC(
    right.getFullYear(),
    right.getMonth(),
    right.getDate(),
  );
  const diff = startLeft - startRight;
  return Math.round(diff / (24 * 60 * 60 * 1000));
}

function format(date: Date, pattern: DateFormatPattern) {
  if (pattern === "yyyy-MM-dd") {
    return date.toISOString().slice(0, 10);
  }
  if (pattern === "MMM d") {
    return shortDateFormatter.format(date);
  }
  if (pattern === "MMM d, yyyy") {
    return longDateFormatter.format(date);
  }
  return date.toISOString();
}

export function DashboardOverview() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const role = (session?.user?.role || "USER") as Role;
  const kycStatus = ((session?.user as any)?.kycStatus || "PENDING") as string;

  // --- Admin Specific State ---
  const toParam = searchParams.get("to");
  const fromParam = searchParams.get("from");
  const cityParam = searchParams.get("city");

  const today = new Date();
  const toCandidate = toParam ? parseISO(toParam) : today;
  const toDate = isValid(toCandidate) ? toCandidate : today;
  const defaultFrom = subDays(toDate, 29);
  const fromCandidate = fromParam ? parseISO(fromParam) : defaultFrom;
  const fromDate = isValid(fromCandidate) ? fromCandidate : defaultFrom;
  const normalizedFrom = fromDate > toDate ? subDays(toDate, 29) : fromDate;

  const fromIso = format(normalizedFrom, "yyyy-MM-dd");
  const toIso = format(toDate, "yyyy-MM-dd");
  const selectedCity =
    cityParam && cityParam.trim().length > 0 ? cityParam : "Harare";
  const rangeDays = differenceInCalendarDays(toDate, normalizedFrom) + 1;
  const activeRange: RangeOption | null = RANGE_OPTIONS.includes(
    rangeDays as RangeOption,
  )
    ? (rangeDays as RangeOption)
    : null;

  // --- Hooks ---
  const dashboardQuery = useDashboardMetrics();

  // Conditionally fetch admin metrics - only for ADMIN users
  const isAdmin = role === "ADMIN";
  const overviewQuery = useOverviewMetrics({ enabled: isAdmin });
  const dailyAdsQuery = useDailyAds(fromIso, toIso, { enabled: isAdmin });
  const [agentsLimit, setAgentsLimit] = useState(5);
  const topAgentsQuery = useTopAgents(agentsLimit, { enabled: isAdmin });
  const geoQuery = useGeoListings(selectedCity, { enabled: isAdmin });

  const updateQuery = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const handleRangeChange = useCallback(
    (days: RangeOption) => {
      const newFrom = subDays(toDate, days - 1);
      updateQuery({ from: format(newFrom, "yyyy-MM-dd"), to: toIso });
    },
    [toDate, toIso, updateQuery],
  );

  const handleCityChange = useCallback(
    (value: string) => {
      updateQuery({ city: value });
    },
    [updateQuery],
  );

  // --- Data Preparation ---
  const dailyAds = dailyAdsQuery.data ?? [];
  const overview = overviewQuery.data;
  const topAgents = topAgentsQuery.data?.items ?? [];
  const totalAgents = topAgentsQuery.data?.totalAgents ?? 0;
  const geoData = geoQuery.data;
  const scopedMetrics = dashboardQuery.data;

  // --- Socket.IO for Admin ---
  useEffect(() => {
    const wsEnabled = process.env.NEXT_PUBLIC_WS_ENABLED === "true";

    if (!wsEnabled || !session?.accessToken || !isAdmin) {
      return;
    }

    const apiBase = getPublicApiBaseUrl();
    if (!apiBase) {
      console.warn(
        "Dashboard metrics socket disabled: NEXT_PUBLIC_API_BASE_URL is not configured.",
      );
      return;
    }

    const baseUrl = new URL(apiBase);
    const wsProtocol = baseUrl.protocol === "https:" ? "wss" : "ws";
    const socket = io(`${wsProtocol}://${baseUrl.host}/admin.metrics`, {
      transports: ["websocket"],
      auth: { token: session.accessToken },
    });

    socket.on("metrics:overview:update", (payload: AdminOverviewMetrics) => {
      queryClient.setQueryData(["admin-metrics", "overview"], payload);
    });

    socket.on("metrics:ads:tick", (payload: DailyAdsPoint) => {
      queryClient.setQueryData(
        ["admin-metrics", "ads", fromIso, toIso],
        (current: DailyAdsPoint[] | undefined) => {
          const payloadDay = format(parseISO(payload.date), "yyyy-MM-dd");
          const inRange = payloadDay >= fromIso && payloadDay <= toIso;
          if (!inRange) {
            return current;
          }
          if (!current) {
            return [payload];
          }
          const index = current.findIndex(
            (point) =>
              format(parseISO(point.date), "yyyy-MM-dd") === payloadDay,
          );
          if (index >= 0) {
            const next = current.slice();
            next[index] = payload;
            return next;
          }
          const next = [...current, payload];
          next.sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          );
          return next;
        },
      );
    });

    socket.on("leads:new", () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-metrics", "overview"],
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [fromIso, queryClient, session?.accessToken, toIso, isAdmin]);

  useEffect(() => {
    if (agentsLimit > totalAgents && totalAgents > 0) {
      setAgentsLimit(totalAgents);
    }
  }, [agentsLimit, totalAgents]);

  const [selectedAgent, setSelectedAgent] =
    useState<TopAgentPerformance | null>(null);

  const overviewCards = useMemo(() => {
    if (!overview) return [];
    return [
      {
        key: "listings",
        label: "Verified listings",
        value: numberFormatter.format(overview.listings.verified),
        hint: `${overview.listings.new7d} added this week`,
        delta: `${overview.listings.growth7dPct.toFixed(1)}% vs prior 7d`,
        icon: Building2,
      },
      {
        key: "leads",
        label: "Lead conversion",
        value: `${overview.leads.conversionRate30d.toFixed(1)}%`,
        hint: `${overview.leads.qualified30d}/${overview.leads.total30d} qualified`,
        delta: "30-day conversion",
        icon: MousePointerClick,
      },
      {
        key: "revenue",
        label: "Ad revenue (30d)",
        value: currencyFormatter.format(overview.revenue.total30dUsd),
        hint: `Daily avg ${currencyFormatter.format(overview.revenue.averageDailyUsd)}`,
        delta: `${overview.revenue.deltaPct.toFixed(1)}% vs prev 30d`,
        icon: TrendingUp,
      },
      {
        key: "agents",
        label: "Active agents",
        value: numberFormatter.format(overview.agents.active30d),
        hint: `${overview.agents.new7d} joined last 7d`,
        delta: `${overview.agents.total} total roster`,
        icon: Users,
      },
    ];
  }, [overview]);

  const dailyAdsChartData = useMemo(
    () =>
      dailyAds.map((point) => ({
        dateLabel: format(parseISO(point.date), "MMM d"),
        revenue: point.revenueUSD,
        impressions: point.impressions,
        clicks: point.clicks,
      })),
    [dailyAds],
  );

  const geoChartData = useMemo(() => {
    if (!geoData) {
      return [];
    }
    return geoData.suburbs.slice(0, 6).map((suburb) => ({
      name: suburb.suburbName,
      verified: suburb.verifiedListings,
      pending: suburb.pendingListings,
    }));
  }, [geoData]);

  const handleCloseDrawer = useCallback(() => setSelectedAgent(null), []);

  // --- Shared Loading State ---
  if (dashboardQuery.isLoading && !isAdmin) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  // --- Render Non-Admin Roles ---
  if (!isAdmin) {
    // Hook must be called unconditionally or conditionally in a safe way if this component re-renders.
    // But since we have early returns, we should move hooks up or ensure consistent order.
    // React hooks rule: "Don't call hooks inside loops, conditions, or nested functions."
    // Since isAdmin is constant for a render (derived from session), this is "technically" safe but bad practice.
    // Better to hoist the hook.
  }

  // Hoisting hooks to top level
  const advertiserQuery = useAdvertiser();

  if (!isAdmin) {
    if (role === "ADVERTISER") {
      const { stats, campaigns, isLoading } = advertiserQuery;

      if (isLoading) return <Skeleton className="h-64 w-full" />;

      if (!stats) return <p>No advertiser data.</p>;

      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Advertiser Dashboard</h1>
            <Button
              onClick={() =>
                alert("Campaign Creation Wizard coming in Phase C")
              }
            >
              Create Campaign
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-neutral-500">
                  Impressions
                </CardTitle>
                <Users className="h-4 w-4 text-neutral-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {numberFormatter.format(stats.impressions)}
                </div>
                <p className="text-xs text-neutral-500">Total ad views</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-neutral-500">
                  Clicks
                </CardTitle>
                <MousePointerClick className="h-4 w-4 text-neutral-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {numberFormatter.format(stats.clicks)}
                </div>
                <p className="text-xs text-neutral-500">
                  Total clicks received
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-neutral-500">
                  Spend
                </CardTitle>
                <Wallet2 className="h-4 w-4 text-neutral-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currencyFormatter.format(stats.spend)}
                </div>
                <p className="text-xs text-neutral-500">Total campaign spend</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-neutral-500">
                  Campaigns
                </CardTitle>
                <LayoutDashboard className="h-4 w-4 text-neutral-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.campaigns}</div>
                <p className="text-xs text-neutral-500">Active campaigns</p>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    if (!scopedMetrics)
      return <p className="text-neutral-500">No dashboard data available.</p>;

    if (scopedMetrics.type === "AGENT") {
      return (
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold">Agent Dashboard</h1>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-neutral-500">
                  Active Listings
                </CardTitle>
                <Building2 className="h-4 w-4 text-neutral-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {scopedMetrics.activeListings}
                </div>
                <p className="text-xs text-neutral-500">
                  Properties verified & live
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-neutral-500">
                  Total Interests
                </CardTitle>
                <Users className="h-4 w-4 text-neutral-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {scopedMetrics.totalInterests}
                </div>
                <p className="text-xs text-neutral-500">
                  Total leads/interests
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-neutral-500">
                  New Leads (7d)
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-neutral-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {scopedMetrics.newLeads7d}
                </div>
                <p className="text-xs text-neutral-500">
                  Recent potential clients
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-neutral-500">
                  Pending Commission
                </CardTitle>
                <Wallet2 className="h-4 w-4 text-neutral-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currencyFormatter.format(scopedMetrics.pendingCommissionUsd)}
                </div>
                <p className="text-xs text-neutral-500">
                  Rewards to be paid out
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    if (scopedMetrics.type === "LANDLORD") {
      return (
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold">Landlord Dashboard</h1>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-neutral-500">
                  Owned Properties
                </CardTitle>
                <Building2 className="h-4 w-4 text-neutral-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {scopedMetrics.ownedProperties}
                </div>
                <p className="text-xs text-neutral-500">Total portfolio size</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-neutral-500">
                  Active Tenants
                </CardTitle>
                <Users className="h-4 w-4 text-neutral-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {scopedMetrics.activeTenants}
                </div>
                <p className="text-xs text-neutral-500">Currently renting</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-neutral-500">
                  Occupancy Rate
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-neutral-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {scopedMetrics.occupancyRate.toFixed(1)}%
                </div>
                <p className="text-xs text-neutral-500">
                  Portfolio utilization
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    // Default / User View
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">My Activity</h1>
        <Card>
          <CardHeader>
            <CardTitle>Upgrade your account</CardTitle>
            <CardDescription>
              Choose a path to unlock agent, agency, or advertiser workflows.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/upgrade/agent")}
            >
              Become Agent
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/upgrade/agency")}
            >
              Create Agency
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/upgrade/advertiser")}
            >
              Become Advertiser
            </Button>
          </CardContent>
        </Card>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500">
                Active Applications
              </CardTitle>
              <LayoutDashboard className="h-4 w-4 text-neutral-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {scopedMetrics?.activeApplications || 0}
              </div>
              <p className="text-xs text-neutral-500">
                Ongoing property applications
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500">
                Saved Properties
              </CardTitle>
              <Users className="h-4 w-4 text-neutral-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {scopedMetrics?.savedProperties || 0}
              </div>
              <p className="text-xs text-neutral-500">Favorites & Watchlist</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500">
                KYC Status
              </CardTitle>
              <ShieldCheck className="h-4 w-4 text-neutral-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <Badge
                  variant={kycStatus === "VERIFIED" ? "default" : "outline"}
                  className={
                    kycStatus === "VERIFIED"
                      ? "bg-emerald-600"
                      : "text-amber-600 border-amber-200 bg-amber-50"
                  }
                >
                  {kycStatus}
                </Badge>
              </div>
              <p className="text-xs text-neutral-500">Identity verification</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // --- Admin Render (Previous Implementation) ---
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">
            Operations overview
          </h1>
          <p className="text-sm text-neutral-600">
            Performance metrics update automatically from live marketplace
            signals.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {RANGE_OPTIONS.map((option) => (
            <Button
              key={option}
              variant={activeRange === option ? "default" : "outline"}
              onClick={() => handleRangeChange(option)}
            >
              Last {option}d
            </Button>
          ))}
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overviewQuery.isLoading &&
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="space-y-4">
              <CardHeader>
                <Skeleton className="h-4 w-28" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
                <Skeleton className="mt-2 h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        {!overviewQuery.isLoading &&
          overviewCards.map((card) => (
            <Card key={card.key} className="border-neutral-200">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-neutral-600">
                    {card.label}
                  </CardTitle>
                  <CardDescription>{card.hint}</CardDescription>
                </div>
                <card.icon className="h-5 w-5 text-neutral-500" aria-hidden />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-neutral-900">
                  {card.value}
                </p>
                <p className="mt-2 text-xs font-medium text-neutral-500">
                  {card.delta}
                </p>
              </CardContent>
            </Card>
          ))}
        {overviewQuery.isError && !overview && (
          <Card className="md:col-span-2 xl:col-span-4 border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-700">
                Unable to load overview metrics
              </CardTitle>
              <CardDescription className="text-red-600">
                Please refresh or try again later.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="border-neutral-200">
          <CardHeader>
            <CardTitle>Daily ad performance</CardTitle>
            <CardDescription>
              {format(normalizedFrom, "MMM d, yyyy")} –{" "}
              {format(toDate, "MMM d, yyyy")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dailyAdsQuery.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : dailyAdsChartData.length === 0 ? (
              <p className="text-sm text-neutral-500">
                No ad activity recorded for the selected range.
              </p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer>
                  <AreaChart
                    data={dailyAdsChartData}
                    margin={{ left: 8, right: 16 }}
                  >
                    <defs>
                      <linearGradient
                        id="revenueGradient"
                        x1="0"
                        x2="0"
                        y1="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#6366f1"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="95%"
                          stopColor="#6366f1"
                          stopOpacity={0.05}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="dateLabel" stroke="#4b5563" fontSize={12} />
                    <YAxis
                      yAxisId="left"
                      stroke="#4b5563"
                      fontSize={12}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#94a3b8"
                      fontSize={12}
                    />
                    <RechartsTooltip
                      formatter={(value: number, name) => {
                        if (name === "revenue") {
                          return [currencyFormatter.format(value), "Revenue"];
                        }
                        return [
                          numberFormatter.format(value),
                          name === "impressions" ? "Impressions" : "Clicks",
                        ];
                      }}
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      stroke="#4f46e5"
                      fill="url(#revenueGradient)"
                      name="revenue"
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="impressions"
                      fill="#a855f7"
                      name="impressions"
                      opacity={0.45}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-neutral-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Market footprint</CardTitle>
              <CardDescription>Top suburbs by verified supply</CardDescription>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-neutral-500" aria-hidden />
              <select
                value={selectedCity}
                onChange={(event) => handleCityChange(event.target.value)}
                className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-sm"
              >
                {CITY_CHOICES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {geoQuery.isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : geoData && geoData.suburbs.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer>
                  <BarChart
                    data={geoChartData}
                    margin={{ left: 16, right: 16 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#4b5563" fontSize={12} />
                    <YAxis stroke="#4b5563" fontSize={12} />
                    <RechartsTooltip
                      formatter={(value: number, name) => [
                        numberFormatter.format(value),
                        name,
                      ]}
                    />
                    <Bar
                      dataKey="verified"
                      fill="#22c55e"
                      name="Verified"
                      radius={4}
                    />
                    <Bar
                      dataKey="pending"
                      fill="#f97316"
                      name="Pending"
                      radius={4}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-neutral-500">
                No suburb level listings available for this city.
              </p>
            )}

            {geoData && geoData.suburbs.length > 0 && (
              <div className="space-y-2">
                {geoData.suburbs.slice(0, 4).map((suburb) => (
                  <div
                    key={suburb.suburbId}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-medium text-neutral-700">
                      {suburb.suburbName}
                    </span>
                    <span className="text-neutral-500">
                      {suburb.verifiedListings} verified ·{" "}
                      {suburb.pendingListings} pending ·{" "}
                      {suburb.marketSharePct.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card className="border-neutral-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Top agents</CardTitle>
              <CardDescription>Performance this month</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setAgentsLimit((limit) => Math.max(5, limit - 5))
                }
                disabled={agentsLimit <= 5}
              >
                Show fewer
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setAgentsLimit((limit) =>
                    Math.min(limit + 5, totalAgents || limit + 5),
                  )
                }
                disabled={totalAgents > 0 && agentsLimit >= totalAgents}
              >
                Show more
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {topAgentsQuery.isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : topAgents.length === 0 ? (
              <p className="text-sm text-neutral-500">
                No agent activity recorded for this period.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="bg-neutral-50 text-neutral-600">
                    <tr>
                      <th className="px-4 py-2 font-medium">Agent</th>
                      <th className="px-4 py-2 font-medium">
                        Verified listings
                      </th>
                      <th className="px-4 py-2 font-medium">Valid leads</th>
                      <th className="px-4 py-2 font-medium">Month points</th>
                      <th className="px-4 py-2 font-medium">Est. payout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topAgents.map((agent) => (
                      <tr
                        key={agent.agentId}
                        className="cursor-pointer border-b border-neutral-100 text-neutral-700 transition hover:bg-neutral-50"
                        onClick={() => setSelectedAgent(agent)}
                      >
                        <td className="px-4 py-2 font-medium">
                          {agent.agentName ?? "Unnamed agent"}
                        </td>
                        <td className="px-4 py-2">
                          {numberFormatter.format(agent.verifiedListings)}
                        </td>
                        <td className="px-4 py-2">
                          {numberFormatter.format(agent.validLeads)}
                        </td>
                        <td className="px-4 py-2">
                          {numberFormatter.format(agent.monthPoints)}
                        </td>
                        <td className="px-4 py-2">
                          {currencyFormatter.format(agent.estPayoutUSD)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-neutral-200">
          <CardHeader>
            <CardTitle>Payout pipeline</CardTitle>
            <CardDescription>
              Pending disbursements and wallet state
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-neutral-600">
            {overview ? (
              <>
                <div className="flex items-center justify-between rounded-md bg-neutral-50 px-3 py-2">
                  <span>Pending payouts</span>
                  <span className="font-medium text-neutral-800">
                    {currencyFormatter.format(overview.payouts.pendingUsd)} ·{" "}
                    {overview.payouts.pendingCount}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-md bg-neutral-50 px-3 py-2">
                  <span>Settled (30d)</span>
                  <span className="font-medium text-neutral-800">
                    {currencyFormatter.format(overview.payouts.settled30dUsd)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-md bg-neutral-50 px-3 py-2">
                  <span>Ad impressions</span>
                  <span className="font-medium text-neutral-800">
                    {numberFormatter.format(overview.traffic.impressions30d)} ·
                    CTR {overview.traffic.ctr30d.toFixed(1)}%
                  </span>
                </div>
              </>
            ) : (
              <Skeleton className="h-32 w-full" />
            )}
          </CardContent>
        </Card>
      </section>

      {selectedAgent && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={handleCloseDrawer}
            aria-hidden
          />
          <aside className="relative h-full w-full max-w-md overflow-y-auto bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">
                  {selectedAgent.agentName ?? "Agent details"}
                </h2>
                <p className="text-sm text-neutral-500">
                  Agent ID: {selectedAgent.agentId}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCloseDrawer}
                aria-label="Close agent details"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4 px-6 py-6 text-sm text-neutral-700">
              <div className="flex items-center justify-between">
                <span>Verified listings</span>
                <span className="font-medium">
                  {numberFormatter.format(selectedAgent.verifiedListings)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Valid leads</span>
                <span className="font-medium">
                  {numberFormatter.format(selectedAgent.validLeads)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Month points</span>
                <span className="font-medium">
                  {numberFormatter.format(selectedAgent.monthPoints)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Estimated payout</span>
                <span className="font-semibold text-neutral-900">
                  {currencyFormatter.format(selectedAgent.estPayoutUSD)}
                </span>
              </div>
              <p className="rounded-md bg-neutral-50 p-3 text-xs text-neutral-500">
                Payout forecasts refresh automatically when new reward events
                post or listings verify. Agents are eligible for disbursement
                once earnings clear the wallet threshold.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
