"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { buildBoundsString as buildBoundsStringFromCoords } from "@/lib/homepage-data";

interface CityItem {
  id: string;
  name: string;
  province?: string | null;
  lat?: number | null;
  lng?: number | null;
  count?: number;
}

interface SuburbItem {
  id: string;
  name: string;
  city?: string | null;
  count?: number;
}

interface ExploreByAreaSectionProps {
  cities: CityItem[];
  popularAreas: SuburbItem[];
}

export function ExploreByAreaSection({
  cities,
  popularAreas,
}: ExploreByAreaSectionProps) {
  return (
    <section
      id="explore"
      className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 sm:px-12 lg:px-16"
    >
      <div className="flex flex-col gap-3">
        <span className="text-xs uppercase tracking-[0.35em] text-emerald-500">
          Explore by area
        </span>
        <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">
          Browse cities and popular suburbs nearby
        </h2>
        <p className="max-w-2xl text-base text-muted-foreground">
          Discover trusted homes across Zimbabwe with verified-only results by
          default.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cities.map((location) => (
          <Link
            key={location.id}
            href={`/listings?verifiedOnly=true&bounds=${encodeURIComponent(
              buildBoundsStringFromCoords(
                { lat: location.lat ?? 0, lng: location.lng ?? 0 },
                35,
              ),
            )}`}
            className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  City
                </p>
                <h3 className="mt-2 text-xl font-semibold text-card-foreground">
                  {location.name}
                </h3>
                {location.province ? (
                  <p className="text-xs text-muted-foreground">
                    {location.province}
                  </p>
                ) : null}
              </div>
              <MapPin className="h-6 w-6 text-emerald-500" />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Explore verified listings in {location.name}.
            </p>
            {location.count ? (
              <span className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                {location.count} listings
              </span>
            ) : null}
          </Link>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {popularAreas.length ? (
          popularAreas.map((area) => (
            <Link
              key={area.id}
              href={`/listings?verifiedOnly=true&suburb=${encodeURIComponent(area.name)}`}
              className="flex items-center justify-between rounded-2xl border border-border bg-muted/60 px-5 py-4 text-sm text-foreground transition hover:border-emerald-200 hover:text-emerald-600"
            >
              <span className="font-semibold">
                {area.name}
                {area.city ? `, ${area.city}` : ""}
              </span>
              <span className="rounded-full bg-card px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                {area.count ?? 0} listings
              </span>
            </Link>
          ))
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            We are still mapping popular suburbs near you.
          </div>
        )}
      </div>
    </section>
  );
}
