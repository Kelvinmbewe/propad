"use client";

import Image from "next/image";
import Link from "next/link";
import { useNearbyProperties } from "@/hooks/use-nearby-properties";
import { getImageUrl } from "@/lib/image-url";
import { PROPERTY_PLACEHOLDER_IMAGE } from "@/lib/property-placeholder";

export function NearbyListingsPanel({
  currentId,
  lat,
  lng,
  intent,
  price,
  locationLabel,
  areaQuery,
}: {
  currentId: string;
  lat?: number;
  lng?: number;
  intent: "FOR_SALE" | "TO_RENT";
  price?: number;
  locationLabel: string;
  areaQuery: string;
}) {
  const nearbyQuery = useNearbyProperties({
    currentId,
    lat,
    lng,
    intent,
    price,
    radiusKm: 10,
  });

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5 text-card-foreground">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Nearby properties
          </h2>
          <p className="text-sm text-muted-foreground">
            Ranked by trust, proximity, and price match.
          </p>
        </div>
        <Link
          href={`/listings?intent=${intent}&q=${encodeURIComponent(areaQuery)}`}
          className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600 hover:text-emerald-500"
        >
          View more in {locationLabel}
        </Link>
      </div>

      {nearbyQuery.isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-36 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : nearbyQuery.data?.items?.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {nearbyQuery.data.items.map((item) => (
            <Link
              key={item.id}
              href={`/properties/${item.id}`}
              className="group flex gap-3 rounded-xl border border-border bg-background p-3 transition hover:border-emerald-300"
            >
              <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-lg bg-muted">
                <Image
                  src={
                    item.imageUrl
                      ? getImageUrl(item.imageUrl)
                      : PROPERTY_PLACEHOLDER_IMAGE
                  }
                  alt={item.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="line-clamp-1 text-sm font-semibold text-foreground">
                  {item.title}
                </p>
                <p className="text-sm font-semibold text-emerald-600">
                  {item.currency} {item.price.toLocaleString()}
                </p>
                <p className="line-clamp-1 text-xs text-muted-foreground">
                  {item.locationText}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.distanceKm.toFixed(1)} km · Trust{" "}
                  {Math.round(item.trustScore)}/110
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-muted px-4 py-6 text-sm text-muted-foreground">
          We could not find nearby matches right now.
        </div>
      )}
    </section>
  );
}
