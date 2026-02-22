"use client";

import { Switch } from "@propad/ui";
import type { ListingsIntent } from "@/lib/listings";

export function ListingsTopBar({
  intent,
  activeLocation,
  total,
  verifiedOnly,
  radiusKm,
  drawAreaEnabled,
  onVerifiedOnlyChange,
}: {
  intent: ListingsIntent;
  activeLocation: string;
  total: number;
  verifiedOnly: boolean;
  radiusKm: 150 | 300 | 500;
  drawAreaEnabled: boolean;
  onVerifiedOnlyChange: (next: boolean) => void;
}) {
  const title =
    intent === "TO_RENT"
      ? `Properties to rent in ${activeLocation}`
      : `Properties for sale in ${activeLocation}`;

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">
          {title}
        </h1>
        <p className="text-sm text-slate-600">
          {total.toLocaleString()} matching properties. Verified properties lead
          the pack. Pending verification listings are marked and ranked lower.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
          Verified only
          <Switch
            checked={verifiedOnly}
            onCheckedChange={onVerifiedOnlyChange}
            aria-label="Verified only"
          />
        </label>
        <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">
          Near {activeLocation} within {radiusKm}km
        </span>
        {drawAreaEnabled ? (
          <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">
            Draw area
          </span>
        ) : null}
      </div>
    </section>
  );
}
