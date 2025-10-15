'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis
} from 'recharts';
import {
  Bell,
  Building2,
  CircleDollarSign,
  Gauge,
  LayoutDashboard,
  LineChart as LineChartIcon,
  ListChecks,
  Menu,
  MessageCircle,
  Settings,
  ShieldCheck,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
  Label,
  Skeleton,
  cn,
  useAuroraTheme
} from '@propad/ui';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';

type DashboardMetrics = {
  activeListings: number;
  pendingVerifications: number;
  rewardPoolUsd: number;
};

const pastelPalette = ['#68D391', '#9F7AEA', '#F6AD55', '#FC8181'] as const;

const navigationItems = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Listings', href: '/dashboard/listings', icon: Building2 },
  { label: 'Verifications', href: '/dashboard/verifications', icon: ShieldCheck },
  { label: 'Reward pool', href: '/dashboard/reward-pool', icon: CircleDollarSign }
];

export function DashboardOverview() {
  const sdk = useAuthenticatedSDK();
  const { toggle, mode } = useAuroraTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard:stats'],
    queryFn: () => sdk!.metrics.dashboard(),
    enabled: !!sdk
  });

  if (!sdk) {
    return <p className="text-sm text-neutral-500">Preparing your dashboard…</p>;
  }

  const metrics: DashboardMetrics = data ?? {
    activeListings: 0,
    pendingVerifications: 0,
    rewardPoolUsd: 0
  };

  const trendData = useMemo(() => {
    const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
    const baseline = Math.max(metrics.rewardPoolUsd, 6);
    const demand = Math.max(metrics.activeListings, 10);
    const pending = Math.max(metrics.pendingVerifications, 4);

    return months.map((month, index) => {
      const growthFactor = 0.65 + index * 0.07;
      return {
        month,
        rewards: Number((baseline * growthFactor).toFixed(1)),
        verifications: Math.round(demand * (0.4 + index * 0.05)),
        pending: Math.round(pending * (0.5 - index * 0.05))
      };
    });
  }, [metrics]);

  const pipelineData = useMemo(
    () => [
      {
        stage: 'New',
        listings: Math.max(metrics.activeListings - metrics.pendingVerifications, 2) + 12
      },
      {
        stage: 'In review',
        listings: metrics.pendingVerifications + 8
      },
      {
        stage: 'Ready to publish',
        listings: Math.max(Math.round(metrics.activeListings * 0.6), 4) + 6
      },
      {
        stage: 'Featured',
        listings: Math.max(Math.round(metrics.activeListings * 0.35), 2) + 4
      }
    ],
    [metrics]
  );

  const performanceRows = useMemo(
    () => [
      {
        property: 'Emerald Heights',
        views: 1240 + metrics.activeListings * 3,
        inquiries: 32 + Math.round(metrics.rewardPoolUsd / 12),
        status: 'Live'
      },
      {
        property: 'Harare Gardens Loft',
        views: 980 + metrics.pendingVerifications * 5,
        inquiries: 21 + Math.round(metrics.activeListings / 4),
        status: 'Boosted'
      },
      {
        property: 'Matobo Villas',
        views: 860 + metrics.pendingVerifications * 4,
        inquiries: 19 + Math.round(metrics.rewardPoolUsd / 18),
        status: 'Needs media'
      },
      {
        property: 'Vic Falls Residences',
        views: 742 + metrics.activeListings * 2,
        inquiries: 15 + Math.round(metrics.pendingVerifications / 2),
        status: 'Live'
      }
    ],
    [metrics]
  );

  const activityItems = useMemo(
    () => [
      {
        title: 'New listing approved',
        description: 'A property manager published a verified listing.',
        time: '2 hours ago',
        accent: pastelPalette[0]
      },
      {
        title: 'Verification follow-up',
        description: `${metrics.pendingVerifications} listings need additional photos.`,
        time: 'Today, 09:35',
        accent: pastelPalette[1]
      },
      {
        title: 'Reward pool update',
        description: `USD ${metrics.rewardPoolUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })} ready to allocate.`,
        time: 'Yesterday, 18:10',
        accent: pastelPalette[2]
      },
      {
        title: 'Team message',
        description: 'Finance shared payout reminders for verified landlords.',
        time: 'Yesterday, 14:52',
        accent: pastelPalette[3]
      }
    ],
    [metrics]
  );

  const stats = [
    {
      title: 'Active listings',
      value: metrics.activeListings.toLocaleString(),
      change: 'Up 12% vs last sprint',
      icon: Building2,
      accent: 'from-emerald-400 via-teal-400 to-sky-500'
    },
    {
      title: 'Pending verifications',
      value: metrics.pendingVerifications.toLocaleString(),
      change: 'Queue cleared every 36 hours',
      icon: ShieldCheck,
      accent: 'from-violet-400 via-purple-400 to-indigo-500'
    },
    {
      title: 'Reward pool (USD)',
      value: `$${metrics.rewardPoolUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      change: 'Smooth growth over the past 6 weeks',
      icon: CircleDollarSign,
      accent: 'from-amber-400 via-orange-400 to-rose-400'
    }
  ];

  return (
    <div className="relative flex min-h-screen bg-gradient-to-br from-neutral-100 via-white to-neutral-200 text-neutral-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-white">
      <aside
        className={cn(
          'relative hidden min-h-screen border-r border-transparent bg-white/70 px-3 py-6 backdrop-blur-xl transition-all duration-300 dark:bg-slate-950/70 md:flex',
          sidebarCollapsed ? 'w-20' : 'w-64'
        )}
        aria-label="Primary"
      >
        <span className="pointer-events-none absolute right-0 top-0 h-full w-px bg-gradient-to-b from-emerald-400 via-purple-400 to-orange-400" />
        <div className="flex flex-1 flex-col gap-8">
          <div className="flex items-center justify-between px-2">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 via-purple-400 to-orange-400 text-white shadow-lg">
                <Gauge className="h-5 w-5" />
              </span>
              {!sidebarCollapsed && <span className="text-sm font-semibold tracking-wide">PropAd Control</span>}
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
          <nav className="flex flex-1 flex-col gap-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-500 transition hover:bg-white/70 hover:text-neutral-900 dark:hover:bg-slate-900/70 dark:hover:text-white',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent'
                  )}
                  title={item.label}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-neutral-200 via-neutral-100 to-white text-neutral-600 shadow-sm transition group-hover:from-emerald-100 group-hover:via-purple-100 group-hover:to-orange-100 dark:from-slate-800 dark:via-slate-900 dark:to-slate-950">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>
          <div className={cn('mt-auto rounded-2xl border border-white/40 bg-white/80 p-4 text-xs shadow-lg dark:border-white/10 dark:bg-slate-900/80', sidebarCollapsed && 'hidden')}>
            <p className="font-semibold text-neutral-700 dark:text-neutral-200">Automations</p>
            <p className="mt-1 text-neutral-500 dark:text-neutral-400">
              Keep your verification queue organised by enabling automatic reminders for agents.
            </p>
            <Button variant="default" className="mt-3 h-8 rounded-full bg-neutral-900 text-xs text-white hover:bg-neutral-800 dark:bg-white dark:text-slate-900 dark:hover:bg-neutral-200">
              Configure
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-white/40 bg-white/80 px-4 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setSidebarCollapsed((prev) => !prev)}
                aria-label={sidebarCollapsed ? 'Open navigation' : 'Hide navigation'}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Agent Command Center</p>
                <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">Portfolio momentum</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="rounded-full border-neutral-200 bg-white/90 text-sm font-medium text-neutral-700 hover:border-emerald-400 hover:text-neutral-900 dark:border-slate-700 dark:bg-slate-900/80 dark:text-neutral-200"
              >
                Export snapshot
              </Button>
              <Button
                className="rounded-full bg-gradient-to-r from-emerald-400 via-purple-400 to-orange-400 px-4 text-white shadow-lg shadow-emerald-200/40 hover:opacity-90"
              >
                Add listing
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                aria-label="Toggle notifications"
                onClick={() => setDrawerOpen(true)}
              >
                <Bell className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                aria-label="Toggle dark mode"
                onClick={toggle}
              >
                {mode === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              <div className="hidden items-center gap-2 rounded-full border border-white/50 bg-white/80 px-3 py-1 shadow-md backdrop-blur dark:border-white/10 dark:bg-slate-900/70 md:flex">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 via-purple-400 to-orange-400 text-sm font-semibold text-white">
                  AJ
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">Anesu J.</p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Portfolio lead</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {isError && (
          <div className="px-6 pt-6">
            <Card className="rounded-xl border border-red-100 bg-red-50/70 text-red-700 shadow-lg dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base">Unable to load fresh metrics</CardTitle>
                <CardDescription className="text-sm text-red-600 dark:text-red-200/80">
                  Showing cached interface while we retry your PropAd data. Try refreshing in a moment.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        )}

        <main className="flex-1 overflow-y-auto px-6 pb-10 pt-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,0.9fr)]">
            <section className="space-y-6">
              <div className="grid gap-4">
                {stats.map((stat) => (
                  <StatCard key={stat.title} loading={isLoading} {...stat} />
                ))}
              </div>

              <Card className="rounded-xl border-transparent bg-white/80 shadow-lg shadow-neutral-200/40 backdrop-blur dark:bg-slate-900/70 dark:shadow-slate-950/40">
                <CardHeader className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ListChecks className="h-4 w-4 text-emerald-400" /> Verification queue health
                  </CardTitle>
                  <CardDescription className="text-sm text-neutral-500 dark:text-neutral-400">
                    Smart reminders escalate listings stuck over 48 hours.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 text-sm text-neutral-600 dark:text-neutral-300">
                  <p>
                    {metrics.pendingVerifications === 0
                      ? 'All verifications are on track. No backlog reported.'
                      : `${metrics.pendingVerifications.toLocaleString()} listings await media checks. The automations team is nudging assignees.`}
                  </p>
                </CardContent>
              </Card>
            </section>

            <section className="space-y-6">
              <Card className="rounded-xl border-transparent bg-white/80 shadow-lg shadow-neutral-200/50 backdrop-blur dark:bg-slate-900/70 dark:shadow-slate-950/40">
                <CardHeader className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <LineChartIcon className="h-4 w-4 text-purple-400" /> Reward momentum
                  </CardTitle>
                  <CardDescription className="text-sm text-neutral-500 dark:text-neutral-400">
                    Pastel trendlines visualise rewards against verification throughput.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="h-64 w-full">
                    {isLoading ? (
                      <Skeleton className="h-full w-full rounded-xl" />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="rewardsGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={pastelPalette[1]} stopOpacity={0.8} />
                              <stop offset="95%" stopColor={pastelPalette[1]} stopOpacity={0.1} />
                            </linearGradient>
                            <linearGradient id="verificationsGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={pastelPalette[0]} stopOpacity={0.8} />
                              <stop offset="95%" stopColor={pastelPalette[0]} stopOpacity={0.1} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="4 8" stroke="rgba(148, 163, 184, 0.3)" vertical={false} />
                          <XAxis dataKey="month" stroke="currentColor" tickLine={false} axisLine={false} />
                          <YAxis stroke="currentColor" tickLine={false} axisLine={false} width={50} />
                          <RechartsTooltip
                            cursor={{ stroke: 'rgba(148, 163, 184, 0.4)', strokeDasharray: '4 4' }}
                            contentStyle={{
                              background: 'rgba(17, 24, 39, 0.85)',
                              color: 'white',
                              borderRadius: 12,
                              border: 'none',
                              boxShadow: '0 20px 45px rgba(15,23,42,0.25)'
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="rewards"
                            stroke={pastelPalette[1]}
                            strokeWidth={3}
                            fill="url(#rewardsGradient)"
                            activeDot={{ r: 6 }}
                          />
                          <Area
                            type="monotone"
                            dataKey="verifications"
                            stroke={pastelPalette[0]}
                            strokeWidth={3}
                            fill="url(#verificationsGradient)"
                            activeDot={{ r: 6 }}
                          />
                          <Line type="monotone" dataKey="pending" stroke={pastelPalette[3]} strokeWidth={2} strokeDasharray="6 4" dot={false} />
                          <Legend />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl border-transparent bg-white/80 shadow-lg shadow-neutral-200/40 backdrop-blur dark:bg-slate-900/70 dark:shadow-slate-950/40">
                <CardHeader className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <LineChartIcon className="h-4 w-4 text-amber-400" /> Pipeline mix
                  </CardTitle>
                  <CardDescription className="text-sm text-neutral-500 dark:text-neutral-400">
                    Stacked bars show where listings sit in the publication pipeline.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="h-60 w-full">
                    {isLoading ? (
                      <Skeleton className="h-full w-full rounded-xl" />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={pipelineData} barSize={28}>
                          <CartesianGrid strokeDasharray="3 6" stroke="rgba(148, 163, 184, 0.25)" vertical={false} />
                          <XAxis dataKey="stage" stroke="currentColor" axisLine={false} tickLine={false} />
                          <YAxis stroke="currentColor" axisLine={false} tickLine={false} width={40} />
                          <RechartsTooltip
                            cursor={{ fill: 'rgba(248, 250, 252, 0.6)' }}
                            contentStyle={{
                              background: 'rgba(15, 23, 42, 0.9)',
                              color: 'white',
                              borderRadius: 12,
                              border: 'none'
                            }}
                          />
                          <Bar dataKey="listings" radius={[12, 12, 4, 4]} fill={pastelPalette[2]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl border-transparent bg-white/80 shadow-lg shadow-neutral-200/30 backdrop-blur dark:bg-slate-900/70 dark:shadow-slate-950/40">
                <CardHeader className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="h-4 w-4 text-emerald-400" /> Property performance
                  </CardTitle>
                  <CardDescription className="text-sm text-neutral-500 dark:text-neutral-400">
                    Alternating rows and gradient hover accents guide quick comparisons.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="overflow-hidden rounded-xl border border-white/40 dark:border-white/10">
                    <table className="min-w-full divide-y divide-white/50 text-left text-sm dark:divide-white/10">
                      <thead className="bg-white/70 text-xs uppercase tracking-wide text-neutral-500 dark:bg-slate-900/60 dark:text-neutral-400">
                        <tr>
                          <th scope="col" className="px-5 py-3">Property</th>
                          <th scope="col" className="px-5 py-3">Views</th>
                          <th scope="col" className="px-5 py-3">Inquiries</th>
                          <th scope="col" className="px-5 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {performanceRows.map((row) => (
                          <tr
                            key={row.property}
                            className="group relative overflow-hidden odd:bg-white/90 even:bg-white/70 transition-colors hover:bg-white/95 dark:odd:bg-slate-900/60 dark:even:bg-slate-900/40"
                          >
                            <td className="relative px-5 py-4 font-medium text-neutral-700 dark:text-neutral-100">
                              <span className="absolute inset-x-5 top-0 h-0.5 scale-x-0 rounded-full bg-gradient-to-r from-emerald-400 via-purple-400 to-orange-400 transition-transform duration-300 ease-out content-[''] group-hover:scale-x-100" />
                              {row.property}
                            </td>
                            <td className="px-5 py-4 text-neutral-600 dark:text-neutral-200">{row.views.toLocaleString()}</td>
                            <td className="px-5 py-4 text-neutral-600 dark:text-neutral-200">{row.inquiries.toLocaleString()}</td>
                            <td className="px-5 py-4 text-neutral-600 dark:text-neutral-200">
                              <span className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-400/20 via-purple-400/20 to-orange-400/20 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section className="space-y-6">
              <Card className="rounded-xl border-transparent bg-white/80 shadow-lg shadow-neutral-200/40 backdrop-blur dark:bg-slate-900/70 dark:shadow-slate-950/40">
                <CardHeader className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Bell className="h-4 w-4 text-rose-400" /> Activity feed
                  </CardTitle>
                  <CardDescription className="text-sm text-neutral-500 dark:text-neutral-400">
                    Recent actions and nudges from the PropAd automation layer.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex flex-col gap-4">
                    {activityItems.map((activity) => (
                      <article key={activity.title} className="relative overflow-hidden rounded-xl border border-white/40 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
                        <span
                          className="absolute left-0 top-0 h-full w-1 rounded-full"
                          style={{ background: `linear-gradient(180deg, ${activity.accent} 0%, rgba(255,255,255,0) 100%)` }}
                          aria-hidden="true"
                        />
                        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{activity.title}</h3>
                        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{activity.description}</p>
                        <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">{activity.time}</p>
                      </article>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl border-transparent bg-white/80 shadow-lg shadow-neutral-200/30 backdrop-blur dark:bg-slate-900/70 dark:shadow-slate-950/40">
                <CardHeader className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MessageCircle className="h-4 w-4 text-sky-400" /> Quick note to ops
                  </CardTitle>
                  <CardDescription className="text-sm text-neutral-500 dark:text-neutral-400">
                    Floating labels and accent outlines keep handoffs clear.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="relative">
                      <Input
                        id="ops-subject"
                        placeholder=" "
                        className="peer h-12 rounded-xl border border-neutral-200 bg-white/90 px-4 pt-6 text-sm text-neutral-700 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-900/80 dark:text-neutral-100"
                      />
                      <Label
                        htmlFor="ops-subject"
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs uppercase tracking-wide text-neutral-400 transition-all duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:uppercase peer-focus:top-2 peer-focus:text-[11px] peer-focus:text-emerald-500"
                      >
                        Subject
                      </Label>
                    </div>
                    <div className="relative">
                      <textarea
                        id="ops-message"
                        placeholder=" "
                        rows={4}
                        className="peer w-full resize-none rounded-xl border border-neutral-200 bg-white/90 px-4 pb-3 pt-6 text-sm text-neutral-700 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-900/80 dark:text-neutral-100"
                      />
                      <Label
                        htmlFor="ops-message"
                        className="pointer-events-none absolute left-4 top-5 text-xs uppercase tracking-wide text-neutral-400 transition-all duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:uppercase peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[11px] peer-focus:text-emerald-500"
                      >
                        Message
                      </Label>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                    <span>Average response time: 12 minutes</span>
                    <Button className="rounded-full bg-gradient-to-r from-emerald-400 via-purple-400 to-orange-400 px-4 text-xs font-semibold text-white shadow-md hover:opacity-90">
                      Send to ops desk
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
        </main>
      </div>

      <NotificationsDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}

type StatCardProps = {
  title: string;
  value: string;
  change: string;
  icon: typeof Building2;
  accent: string;
  loading?: boolean;
};

function StatCard({ title, value, change, icon: Icon, accent, loading }: StatCardProps) {
  return (
    <Card className="rounded-xl border-transparent bg-white/80 shadow-lg shadow-emerald-100/40 backdrop-blur dark:bg-slate-900/70 dark:shadow-slate-950/40">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 p-6 pb-2">
        <div>
          <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-300">{title}</CardTitle>
          <div className="mt-3 text-3xl font-semibold text-neutral-900 dark:text-white">
            {loading ? <Skeleton className="h-9 w-24 rounded-lg" /> : value}
          </div>
        </div>
        <span className={cn('flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg', 'bg-gradient-to-br', accent)} aria-hidden="true">
          <Icon className="h-5 w-5" />
        </span>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        {loading ? (
          <Skeleton className="h-4 w-32 rounded-lg" />
        ) : (
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{change}</p>
        )}
      </CardContent>
    </Card>
  );
}

type NotificationsDrawerProps = {
  open: boolean;
  onClose: () => void;
};

function NotificationsDrawer({ open, onClose }: NotificationsDrawerProps) {
  return (
    <>
      <div
        className={cn('fixed inset-0 z-40 bg-neutral-950/40 transition-opacity duration-300', open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0')}
        aria-hidden="true"
        onClick={onClose}
      />
      <aside
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-full max-w-md transform border-l border-white/30 bg-white/90 p-6 shadow-2xl backdrop-blur-xl transition-transform duration-300 dark:border-white/10 dark:bg-slate-950/90',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        aria-label="Notifications drawer"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Notification center</h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Insights arrive here in real time for rapid follow-up.</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            onClick={onClose}
            aria-label="Close notifications"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="mt-6 space-y-4">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="rounded-xl border border-white/50 bg-white/80 p-4 shadow-md dark:border-white/10 dark:bg-slate-900/80"
            >
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Lead velocity update</p>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                Agents converted <strong>{12 + item * 3}%</strong> more inquiries after activating the outreach cadence.
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-neutral-400 dark:text-neutral-500">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
                Updated moments ago
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-white/40 bg-white/70 p-5 shadow-lg dark:border-white/10 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 via-purple-400 to-orange-400 text-white">
              <Settings className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Workflow tuning</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Let us auto-schedule inspections for verified leads.</p>
            </div>
          </div>
          <Button className="mt-4 w-full rounded-full bg-gradient-to-r from-emerald-400 via-purple-400 to-orange-400 text-sm font-semibold text-white shadow-md hover:opacity-90">
            Enable automation
          </Button>
        </div>
      </aside>
    </>
  );
}

