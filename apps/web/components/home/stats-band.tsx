"use client";

import { useMemo } from "react";
import { ShieldCheck, TrendingUp, UsersRound, Verified } from "lucide-react";
import { type HomeCounts } from "@/lib/homepage-data";
import type { GeoCoords } from "@/hooks/use-geo-preference";
import { useHomeCounts } from "@/hooks/use-home-counts";

interface StatsBandProps {
  coords?: GeoCoords;
  initialCounts?: HomeCounts;
}

const fallbackCounts: HomeCounts = {
  verifiedListingsCount: 0,
  partnersCount: 0,
  newListings30dCount: 0,
  trustChecksCount: 0,
};

export function StatsBand({ coords, initialCounts }: StatsBandProps) {
  // Fetch global counts (no location filtering) to show platform-wide stats
  const { data, isLoading, isError } = useHomeCounts({});
  const resolved = data ?? initialCounts;

  const counts = useMemo(() => {
    if (isError) return fallbackCounts;
    return resolved ?? fallbackCounts;
  }, [isError, resolved]);

  const items = [
    {
      label: "Verified listings",
      value: counts.verifiedListingsCount,
      icon: Verified,
    },
    {
      label: "Agents & agencies",
      value: counts.partnersCount,
      icon: UsersRound,
    },
    {
      label: "Listings added (30 days)",
      value: counts.newListings30dCount,
      icon: TrendingUp,
    },
    {
      label: "Trust checks completed",
      value: counts.trustChecksCount,
      icon: ShieldCheck,
    },
  ];

  return (
    <section className="mx-auto w-full max-w-6xl px-6 sm:px-12 lg:px-16">
      <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-[0_20px_60px_-50px_rgba(15,23,42,0.2)] sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white px-4 py-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  {item.label}
                </p>
                {isLoading ? (
                  <div className="mt-2 h-5 w-16 rounded-full bg-slate-200/70 animate-pulse" />
                ) : (
                  <p className="text-lg font-semibold text-slate-900">
                    {item.value.toLocaleString("en-US")}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {isError ? (
        <p className="mt-3 text-xs text-slate-400">
          Counts are estimates while we refresh live stats.
        </p>
      ) : null}
    </section>
  );
}
