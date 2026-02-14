"use client";

import { AdSlot } from "@/components/ad-slot";
import clsx from "clsx";

const fallbackAds = [
  {
    id: "listings-premium-1",
    title: "Promote your property to verified buyers",
    body: "Feature your listing in top search placements across Zimbabwe.",
    ctaLabel: "Boost your listing",
    href: "/dashboard/listings",
    tone: "emerald" as const,
  },
  {
    id: "listings-premium-2",
    title: "Need trusted help to close faster?",
    body: "Work with verified agents and agencies with top trust performance.",
    ctaLabel: "Explore agencies",
    href: "/agencies",
    tone: "cyan" as const,
  },
];

export function SponsoredSlot({
  source,
  className,
  compact = false,
}: {
  source: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={clsx("space-y-2", className)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
        Sponsored
      </p>
      <AdSlot
        source={source}
        className={clsx(compact ? "min-h-[76px]" : "min-h-[124px]")}
        adsenseEnabled={Boolean(process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID)}
        unitId={process.env.NEXT_PUBLIC_ADSENSE_FEED_SLOT}
        fallbackInhouseAds={fallbackAds}
      />
    </div>
  );
}
