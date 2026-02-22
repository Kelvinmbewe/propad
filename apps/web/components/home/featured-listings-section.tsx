"use client";

import Link from "next/link";
import {
  LandingPropertyCard,
  type LandingProperty,
} from "@/components/landing-property-card";
import { Button } from "@propad/ui";

interface FeaturedListingsSectionProps {
  listings: LandingProperty[];
  viewAllHref: string;
  onListingClick?: (listingId: string) => void;
}

export function FeaturedListingsSection({
  listings,
  viewAllHref,
  onListingClick,
}: FeaturedListingsSectionProps) {
  if (!listings.length) {
    return null;
  }

  return (
    <section
      id="featured"
      className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 sm:px-12 lg:px-16"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-3">
          <span className="text-xs uppercase tracking-[0.35em] text-amber-500">
            Featured properties
          </span>
          <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">
            Premium visibility, still verified.
          </h2>
          <p className="max-w-2xl text-base text-muted-foreground">
            Featured properties maintain trust thresholds while receiving
            premium placement.
          </p>
        </div>
        <Link href={viewAllHref}>
          <Button variant="outline" className="rounded-full">
            View all featured
          </Button>
        </Link>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {listings.map((property) => (
          <LandingPropertyCard
            key={property.id}
            property={property}
            variant="featured"
            onListingClick={onListingClick}
          />
        ))}
      </div>
    </section>
  );
}
