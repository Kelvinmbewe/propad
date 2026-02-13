"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";

const ListingLocationMapCanvas = dynamic(
  () =>
    import("@/components/property-detail/listing-location-map-canvas").then(
      (m) => m.ListingLocationMapCanvas,
    ),
  { ssr: false },
);

export function ListingLocationMap({
  lat,
  lng,
  locationLabel,
}: {
  lat?: number;
  lng?: number;
  locationLabel: string;
}) {
  const hasCoords = typeof lat === "number" && typeof lng === "number";
  const mapLat = hasCoords ? lat : undefined;
  const mapLng = hasCoords ? lng : undefined;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 text-card-foreground">
      <div className="mb-3 flex items-center gap-2">
        <MapPin className="h-4 w-4 text-emerald-500" />
        <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Location
        </h2>
      </div>
      <p className="mb-3 text-sm text-foreground">{locationLabel}</p>
      {typeof mapLat === "number" && typeof mapLng === "number" ? (
        <ListingLocationMapCanvas lat={mapLat} lng={mapLng} />
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-muted px-4 py-6 text-sm text-muted-foreground">
          Exact pin not available for this property yet.
        </div>
      )}
    </section>
  );
}
