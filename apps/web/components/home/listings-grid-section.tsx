"use client";

import Link from "next/link";
import {
  LandingPropertyCard,
  type LandingProperty,
} from "@/components/landing-property-card";
import { AdSlot } from "@/components/ad-slot";
import { Button } from "@propad/ui";

interface ListingsGridSectionProps {
  title: string;
  subtitle: string;
  listings: LandingProperty[];
  viewAllHref: string;
  locationLabel: string;
}

export function ListingsGridSection({
  title,
  subtitle,
  listings,
  viewAllHref,
  locationLabel,
}: ListingsGridSectionProps) {
  return (
    <section
      id="nearby"
      className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 sm:px-12 lg:px-16"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-3">
          <span className="text-xs uppercase tracking-[0.35em] text-emerald-500">
            Homes near {locationLabel}
          </span>
          <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
            {title}
          </h2>
          <p className="max-w-2xl text-base text-slate-600">{subtitle}</p>
        </div>
        <Link href={viewAllHref}>
          <Button variant="outline" className="rounded-full">
            View all properties
          </Button>
        </Link>
      </div>
      {listings.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          No verified listings match this area yet. Try another location or
          adjust filters.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {listings.map((property, index) => {
            const shouldInsertAd = index === 6;
            return (
              <div key={property.id} className="contents">
                {shouldInsertAd ? (
                  <div className="md:col-span-2 lg:col-span-3">
                    <AdSlot
                      source="home-inline"
                      adsenseEnabled={Boolean(
                        process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID,
                      )}
                      unitId={process.env.NEXT_PUBLIC_ADSENSE_FEED_SLOT}
                      className="mx-auto"
                      fallbackInhouseAds={[
                        {
                          id: "inline",
                          title: "Boost your listing for more visibility",
                          body: "Feature verified listings to reach more buyers and renters.",
                          ctaLabel: "Promote a listing",
                          href: "/dashboard/listings",
                          tone: "emerald",
                        },
                      ]}
                    />
                  </div>
                ) : null}
                <LandingPropertyCard property={property} variant="compact" />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
