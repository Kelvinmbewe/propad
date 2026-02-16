"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Switch } from "@propad/ui";
import { useAgentListings } from "@/hooks/use-agent-profile";
import { getImageUrl } from "@/lib/image-url";
import { PROPERTY_PLACEHOLDER_IMAGE } from "@/lib/property-placeholder";

export function AgentListingsPanel({
  agentId,
  canUseAgency,
  initialData,
}: {
  agentId: string;
  canUseAgency: boolean;
  initialData?: any;
}) {
  const [intent, setIntent] = useState<"ALL" | "FOR_SALE" | "TO_RENT">("ALL");
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [sort, setSort] = useState<"TRUST" | "PRICE" | "NEWEST">("TRUST");
  const [view, setView] = useState<"list" | "grid">("list");
  const [scope, setScope] = useState<"AGENT" | "AGENCY">("AGENT");

  const listingsQuery = useAgentListings(
    agentId,
    { intent, verifiedOnly, sort, scope },
    initialData,
  );

  const items = listingsQuery.data?.items ?? [];

  return (
    <section
      id="agent-listings"
      className="space-y-4 rounded-2xl border border-border bg-card p-5 text-card-foreground"
    >
      <div className="flex flex-wrap items-center gap-3">
        {(["ALL", "FOR_SALE", "TO_RENT"] as const).map((tab) => (
          <Button
            key={tab}
            size="sm"
            variant={intent === tab ? "default" : "secondary"}
            onClick={() => setIntent(tab)}
          >
            {tab === "ALL"
              ? "All"
              : tab === "FOR_SALE"
                ? "For Sale"
                : "To Rent"}
          </Button>
        ))}
        {canUseAgency ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              setScope((v) => (v === "AGENT" ? "AGENCY" : "AGENT"))
            }
          >
            {scope === "AGENT" ? "Agent listings" : "Agency listings"}
          </Button>
        ) : null}
        <label className="ml-auto inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Verified only
          <Switch checked={verifiedOnly} onCheckedChange={setVerifiedOnly} />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as any)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="TRUST">Sort: Trust</option>
          <option value="PRICE">Sort: Price</option>
          <option value="NEWEST">Sort: Newest</option>
        </select>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setView((v) => (v === "list" ? "grid" : "list"))}
        >
          {view === "list" ? "Grid" : "List"} view
        </Button>
      </div>

      {listingsQuery.isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-32 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : !items.length ? (
        <div className="rounded-xl border border-dashed border-border bg-muted p-6 text-sm text-muted-foreground">
          No active listings for this filter.
        </div>
      ) : (
        <div
          className={
            view === "grid" ? "grid gap-3 md:grid-cols-2" : "space-y-3"
          }
        >
          {items.map((item: any) => (
            <Link
              key={item.id}
              href={`/properties/${item.id}`}
              className="flex gap-3 rounded-xl border border-border bg-background p-3 hover:border-emerald-300"
            >
              <div className="h-24 w-28 shrink-0 overflow-hidden rounded-lg bg-muted">
                <img
                  src={
                    item.imageUrl
                      ? getImageUrl(item.imageUrl)
                      : PROPERTY_PLACEHOLDER_IMAGE
                  }
                  alt={item.title}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="line-clamp-1 text-sm font-semibold text-foreground">
                  {item.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.locationText || "Zimbabwe"}
                </p>
                <p className="text-sm font-semibold text-emerald-600">
                  {item.currency} {Number(item.price ?? 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  Trust {Math.round(Number(item.trustScore ?? 0))} ·{" "}
                  {item.status}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
