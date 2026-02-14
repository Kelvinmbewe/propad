"use client";

import type { Property } from "@propad/sdk";
import { EmptyState } from "@/components/empty-state";
import { ListingsCard } from "@/components/listings/listings-card";
import { SponsoredSlot } from "@/components/listings/sponsored-slot";
import type { ListingsCardView, ListingsQueryState } from "@/lib/listings";

export function ListingsResultsList({
  items,
  highlightedPropertyId,
  cardView,
  query,
  onHover,
  onLeave,
  onQuickRadius,
  onDisableVerified,
  onTryArea,
}: {
  items: Property[];
  highlightedPropertyId: string | null;
  cardView: ListingsCardView;
  query: ListingsQueryState;
  onHover: (propertyId: string) => void;
  onLeave: (propertyId: string) => void;
  onQuickRadius: (radius: 150 | 300 | 500) => void;
  onDisableVerified: () => void;
  onTryArea: (area: string) => void;
}) {
  if (!items.length) {
    return (
      <EmptyState
        title="No listings yet"
        description="Adjust your radius, relax verification filters, or try a nearby suburb to discover more properties."
        action={
          <>
            {query.radiusKm < 300 ? (
              <button
                type="button"
                className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700"
                onClick={() => onQuickRadius(300)}
              >
                Try 300km
              </button>
            ) : null}
            {query.radiusKm < 500 ? (
              <button
                type="button"
                className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700"
                onClick={() => onQuickRadius(500)}
              >
                Try 500km
              </button>
            ) : null}
            {query.verifiedOnly ? (
              <button
                type="button"
                className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700"
                onClick={onDisableVerified}
              >
                Show pending too
              </button>
            ) : null}
            {[
              "Borrowdale",
              "Avondale",
              "Mount Pleasant",
              "Newlands",
              "Greendale",
            ].map((area) => (
              <button
                key={area}
                type="button"
                className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700"
                onClick={() => onTryArea(area)}
              >
                {area}
              </button>
            ))}
          </>
        }
      />
    );
  }

  return (
    <>
      <div
        className={
          cardView === "grid" ? "grid gap-4 md:grid-cols-2" : "grid gap-4"
        }
      >
        {items.map((property, index) => (
          <div
            key={property.id}
            className="space-y-4"
            id={`listing-card-${property.id}`}
          >
            <ListingsCard
              property={property}
              highlighted={highlightedPropertyId === property.id}
              listMode={cardView === "list"}
              onHover={() => onHover(property.id)}
              onLeave={() => onLeave(property.id)}
            />
            {index === 5 ? (
              <SponsoredSlot
                source="listings-slot-2"
                className="md:col-span-2"
                compact
              />
            ) : null}
          </div>
        ))}
      </div>
    </>
  );
}
