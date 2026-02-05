"use client";

import clsx from "clsx";
import { Camera, FileCheck, MapPin, ShieldCheck } from "lucide-react";

export interface TrustBreakdown {
  photos?: boolean;
  gps?: boolean;
  docs?: boolean;
  siteVisit?: boolean;
}

interface TrustBadgeProps {
  trustScore: number;
  maxScore?: number;
  breakdown?: TrustBreakdown;
  size?: "sm" | "md";
  showBreakdown?: boolean;
}

const breakdownLabels: Array<{
  key: keyof TrustBreakdown;
  label: string;
  icon: typeof Camera;
}> = [
  { key: "photos", label: "Photos", icon: Camera },
  { key: "gps", label: "GPS", icon: MapPin },
  { key: "docs", label: "Docs", icon: FileCheck },
  { key: "siteVisit", label: "Site Visit", icon: ShieldCheck },
];

export function TrustBadge({
  trustScore,
  maxScore = 110,
  breakdown,
  size = "md",
  showBreakdown = true,
}: TrustBadgeProps) {
  const score = Number.isFinite(trustScore) ? trustScore : 0;
  const ratio = maxScore > 0 ? score / maxScore : 0;
  const tone = score >= 85 ? "emerald" : score >= 65 ? "cyan" : "slate";

  return (
    <div className="group relative inline-flex items-center gap-2">
      <div
        className={clsx(
          "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
          size === "sm" ? "text-[11px]" : "text-xs",
          tone === "emerald" &&
            "border-emerald-200 bg-emerald-50 text-emerald-700",
          tone === "cyan" && "border-cyan-200 bg-cyan-50 text-cyan-700",
          tone === "slate" && "border-slate-200 bg-slate-50 text-slate-600",
        )}
      >
        <span className="uppercase tracking-[0.2em]">Trust</span>
        <span className="font-mono">
          {score}/{maxScore}
        </span>
      </div>
      <div className="hidden h-1.5 w-16 rounded-full bg-slate-100 sm:block">
        <div
          className={clsx(
            "h-1.5 rounded-full",
            tone === "emerald" && "bg-emerald-500",
            tone === "cyan" && "bg-cyan-500",
            tone === "slate" && "bg-slate-400",
          )}
          style={{ width: `${Math.min(100, Math.max(6, ratio * 100))}%` }}
        />
      </div>
      {showBreakdown ? (
        <div className="pointer-events-none absolute left-0 top-full z-10 mt-2 hidden w-44 rounded-xl border border-white/40 bg-white/95 p-3 text-[11px] text-slate-600 shadow-lg backdrop-blur-sm group-hover:block">
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
            Verification
          </p>
          <div className="mt-2 space-y-1">
            {breakdownLabels.map((item) => {
              const Icon = item.icon;
              const isActive = Boolean(breakdown?.[item.key]);
              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="flex items-center gap-2">
                    <Icon
                      className={clsx(
                        "h-3 w-3",
                        isActive ? "text-emerald-500" : "text-slate-300",
                      )}
                    />
                    {item.label}
                  </span>
                  <span
                    className={isActive ? "text-emerald-600" : "text-slate-300"}
                  >
                    {isActive ? "Yes" : "No"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
