"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import {
  HeroSearchCard,
  type HomeSearchState,
} from "@/components/home/hero-search-card";
import { StatsBand } from "@/components/home/stats-band";
import { FeaturedListingsSection } from "@/components/home/featured-listings-section";
import { ListingsGridSection } from "@/components/home/listings-grid-section";
import { type LandingProperty } from "@/components/landing-property-card";
import { AdSlot } from "@/components/ad-slot";
import { TrustBadge, type TrustBreakdown } from "@/components/trust/TrustBadge";
import { notify } from "@propad/ui";
import {
  buildBoundsString,
  type HomeAgent,
  type HomeAgency,
  type HomeCounts,
} from "@/lib/homepage-data";
import {
  DEFAULT_HOME_LOCATION,
  QUICK_LOCATIONS,
  type QuickLocation,
} from "@/lib/homepage-locations";
import { useGeoPreference } from "@/hooks/use-geo-preference";
import { useNearbyListings } from "@/hooks/use-nearby-listings";
import { useFeaturedListings } from "@/hooks/use-featured-listings";
import { useHomeAreas } from "@/hooks/use-home-areas";
import { useTopPartners } from "@/hooks/use-top-partners";
import { getImageUrl } from "@/lib/image-url";
import { ShieldCheck, UserCheck } from "lucide-react";

const ExploreByAreaSection = dynamic(
  () =>
    import("@/components/home/explore-by-area-section").then(
      (mod) => mod.ExploreByAreaSection,
    ),
  { ssr: false },
);
const TopPartnersSection = dynamic(
  () =>
    import("@/components/home/top-partners-section").then(
      (mod) => mod.TopPartnersSection,
    ),
  { ssr: false },
);
const SavedSearchCTASection = dynamic(
  () =>
    import("@/components/home/saved-search-cta-section").then(
      (mod) => mod.SavedSearchCTASection,
    ),
  { ssr: false },
);

const FEATURED_MIN_TRUST = 70;

interface HomePageClientProps {
  initialNearbyListings: any[];
  initialFeaturedListings: any[];
  initialTopAgents: HomeAgent[];
  initialTopAgencies: HomeAgency[];
  initialCounts?: HomeCounts;
}

function formatPrice(
  value: number | string | null | undefined,
  currency = "USD",
) {
  const priceValue = typeof value === "string" ? Number(value) : value ?? 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(priceValue);
}

function getDistanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinLat = Math.sin(dLat / 2) ** 2;
  const sinLng = Math.sin(dLng / 2) ** 2;
  const c =
    2 * Math.asin(Math.sqrt(sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng));
  return earthRadius * c;
}

function scoreListing(listing: any, origin: { lat: number; lng: number }) {
  const trust = Number(listing.trustScore ?? 0);
  const lat = Number(listing.lat ?? listing.location?.lat ?? 0);
  const lng = Number(listing.lng ?? listing.location?.lng ?? 0);
  const distance = lat && lng ? getDistanceKm(origin, { lat, lng }) : 45;
  const createdAt = listing.createdAt
    ? new Date(listing.createdAt).getTime()
    : Date.now();
  const recencyDays = Math.max(0, (Date.now() - createdAt) / 86400000);

  const trustScore = trust * 1.6;
  const distanceScore = Math.max(0, 40 - distance);
  const recencyScore = Math.max(0, 30 - recencyDays) * 1.4;
  return trustScore + distanceScore + recencyScore;
}

function deriveTrustBreakdown(listing: any): TrustBreakdown {
  const level = listing.verificationLevel ?? "NONE";
  if (level === "TRUSTED") {
    return { photos: true, gps: true, docs: true, siteVisit: true };
  }
  if (level === "VERIFIED") {
    return { photos: true, gps: true, docs: true, siteVisit: false };
  }
  if (level === "BASIC") {
    return { photos: true, gps: false, docs: true, siteVisit: false };
  }
  return { photos: false, gps: false, docs: false, siteVisit: false };
}

function mapToLandingProperty(listing: any): LandingProperty {
  const location =
    listing.suburb?.name ||
    listing.location?.suburb?.name ||
    listing.suburbName ||
    listing.city?.name ||
    listing.location?.city?.name ||
    listing.cityName ||
    "Zimbabwe";
  const intent = listing.listingIntent === "TO_RENT" ? "rent" : "sale";
  const statusLabel = intent === "rent" ? "FOR RENT" : "FOR SALE";
  const imageUrl = listing.media?.[0]?.url
    ? getImageUrl(listing.media[0].url)
    : "/icons/icon-512.svg";

  return {
    id: listing.id,
    title: listing.title,
    location,
    price: formatPrice(listing.price, listing.currency),
    status: statusLabel,
    statusTone: intent,
    imageUrl,
    beds: listing.bedrooms ?? 0,
    baths: listing.bathrooms ?? 0,
    area: listing.areaSqm ?? 0,
    listingIntent: listing.listingIntent,
    verificationLevel: listing.verificationLevel,
    verificationStatus: listing.status,
    isFeatured:
      listing.isFeatured ?? listing.featuredListing?.status === "ACTIVE",
    trustScore: listing.trustScore ?? 0,
    trustMaxScore: 110,
    trustBreakdown: deriveTrustBreakdown(listing),
  };
}

function parsePriceRange(range: string) {
  if (!range || range === "any") return {};
  if (range === "5000+") return { priceMin: 5000 };
  const [min, max] = range.split("-").map((value) => Number(value));
  return {
    priceMin: Number.isFinite(min) ? min : undefined,
    priceMax: Number.isFinite(max) ? max : undefined,
  };
}

export function HomePageClient({
  initialNearbyListings,
  initialFeaturedListings,
  initialTopAgents,
  initialTopAgencies,
  initialCounts,
}: HomePageClientProps) {
  const { data: session } = useSession();
  const isAuthenticated = Boolean(session?.user?.id);
  const geo = useGeoPreference(DEFAULT_HOME_LOCATION);
  const [searchState, setSearchState] = useState<HomeSearchState>({
    intent: "FOR_SALE",
    locationLabel: geo.label,
    locationId: null,
    locationLevel: null,
    propertyType: "any",
    priceRange: "any",
    verifiedOnly: true,
    minTrust: 60,
  });
  const [activeTab, setActiveTab] = useState<"agents" | "agencies">("agents");

  useEffect(() => {
    setSearchState((prev) => ({
      ...prev,
      locationLabel: geo.label,
      locationId: null,
      locationLevel: null,
    }));
  }, [geo.label, geo.source]);

  const selectedCoords = geo.coords;

  const handleSearchStateChange = (next: Partial<HomeSearchState>) => {
    setSearchState((prev) => ({ ...prev, ...next }));
  };

  const handleQuickLocation = (location: QuickLocation) => {
    if (location.label.toLowerCase() === "near me") {
      geo.requestLocation();
      setSearchState((prev) => ({ ...prev, locationLabel: "Near me" }));
      return;
    }

    geo.setManualLocation({ label: location.label, coords: location.coords });
    setSearchState((prev) => ({
      ...prev,
      locationLabel: location.label,
      locationId: null,
      locationLevel: null,
    }));
  };

  const priceFilters = parsePriceRange(searchState.priceRange);
  const nearbyQuery = useNearbyListings({
    lat: selectedCoords?.lat,
    lng: selectedCoords?.lng,
    city: searchState.locationLabel,
    locationId: searchState.locationId,
    locationLevel: searchState.locationLevel,
    mode: searchState.intent === "FOR_SALE" ? "sale" : "rent",
    verifiedOnly: searchState.verifiedOnly,
    limit: 24,
    minTrust: searchState.minTrust,
    propertyType:
      searchState.propertyType !== "any" ? searchState.propertyType : undefined,
    priceMin: priceFilters.priceMin,
    priceMax: priceFilters.priceMax,
  });
  const featuredQuery = useFeaturedListings({
    lat: selectedCoords?.lat,
    lng: selectedCoords?.lng,
    minTrust: Math.max(FEATURED_MIN_TRUST, searchState.minTrust),
  });
  const agentsQuery = useTopPartners({
    lat: selectedCoords?.lat,
    lng: selectedCoords?.lng,
    type: "agents",
    limit: 6,
  });
  const agenciesQuery = useTopPartners({
    lat: selectedCoords?.lat,
    lng: selectedCoords?.lng,
    type: "agencies",
    limit: 6,
  });
  const areasQuery = useHomeAreas({
    lat: selectedCoords?.lat,
    lng: selectedCoords?.lng,
    city:
      searchState.locationLevel === "CITY"
        ? searchState.locationLabel
        : undefined,
  });

  const nearbyItems = (nearbyQuery.data?.items ??
    initialNearbyListings) as any[];
  const featuredItems = (featuredQuery.data?.items ??
    initialFeaturedListings) as any[];
  const topAgents = (agentsQuery.data?.items ??
    initialTopAgents) as HomeAgent[];
  const topAgencies = (agenciesQuery.data?.items ??
    initialTopAgencies) as HomeAgency[];

  const nearCards = useMemo(
    () => nearbyItems.map(mapToLandingProperty),
    [nearbyItems],
  );
  const featuredCards = useMemo(
    () => featuredItems.map(mapToLandingProperty),
    [featuredItems],
  );
  const areaCities = (areasQuery.data?.cities ?? []) as Array<{
    id: string;
    name: string;
    province?: string | null;
    lat?: number | null;
    lng?: number | null;
    count?: number;
  }>;
  const areaSuburbs = (areasQuery.data?.suburbs ?? []) as Array<{
    id: string;
    name: string;
    city?: string | null;
    count?: number;
  }>;

  const inhouseAds = useMemo(
    () => [
      {
        id: "hero-banner",
        title: "List with PropAd premium placement",
        body: "Featured homes stay verified and earn priority spots across Zimbabwe.",
        ctaLabel: "Boost a listing",
        href: "/dashboard/listings",
        tone: "emerald" as const,
      },
      {
        id: "agent-banner",
        title: "Hire trusted agents for your next move",
        body: "Compare verified agencies and book viewings faster.",
        ctaLabel: "Explore agents",
        href: "/agencies",
        tone: "cyan" as const,
      },
    ],
    [],
  );

  const buildBrowseParams = () => {
    const params = new URLSearchParams();
    params.set("verifiedOnly", searchState.verifiedOnly ? "true" : "false");
    params.set("intent", searchState.intent);
    if (searchState.locationId && searchState.locationLevel) {
      if (searchState.locationLevel === "CITY") {
        params.set("cityId", searchState.locationId);
      }
      if (searchState.locationLevel === "SUBURB") {
        params.set("suburbId", searchState.locationId);
      }
      if (searchState.locationLevel === "PROVINCE") {
        params.set("provinceId", searchState.locationId);
      }
    }
    if (searchState.propertyType !== "any") {
      params.set("type", searchState.propertyType);
    }
    const priceFilters = parsePriceRange(searchState.priceRange);
    if (priceFilters.priceMin) {
      params.set("priceMin", String(priceFilters.priceMin));
    }
    if (priceFilters.priceMax) {
      params.set("priceMax", String(priceFilters.priceMax));
    }
    if (searchState.minTrust > 0) {
      params.set("minTrust", String(searchState.minTrust));
    }
    if (selectedCoords?.lat && selectedCoords?.lng) {
      params.set("bounds", buildBoundsString(selectedCoords, 30));
    }
    return params;
  };

  const buildSearchPayload = () => ({
    intent: searchState.intent,
    locationLabel: searchState.locationLabel,
    locationId: searchState.locationId,
    locationLevel: searchState.locationLevel,
    propertyType: searchState.propertyType,
    priceRange: searchState.priceRange,
    verifiedOnly: searchState.verifiedOnly,
    minTrust: searchState.minTrust,
    coords: selectedCoords,
    createdAt: new Date().toISOString(),
  });

  const handleCreateAlert = () => {
    if (!isAuthenticated) {
      signIn(undefined, { callbackUrl: window.location.href });
      return;
    }

    const payload = buildSearchPayload();
    fetch("/api/home/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Homepage alert",
        intent: payload.intent,
        locationLabel: payload.locationLabel,
        locationId: payload.locationId,
        locationLevel: payload.locationLevel,
        propertyType: payload.propertyType,
        priceRange: payload.priceRange,
        verifiedOnly: payload.verifiedOnly,
        minTrust: payload.minTrust,
        queryJson: payload,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to save");
        }
        notify.success("Alert created for this search.");
      })
      .catch(() => {
        notify.error("We could not save this alert. Please try again.");
      });
  };

  return (
    <main className="flex flex-col gap-16 pb-24 pt-24">
      <HeroSearchCard
        searchState={searchState}
        onSearchStateChange={(next: Partial<HomeSearchState>) => {
          if (
            next.locationLabel &&
            next.locationLabel !== searchState.locationLabel
          ) {
            const match = QUICK_LOCATIONS.find(
              (location) =>
                location.label.toLowerCase() ===
                next.locationLabel?.toLowerCase(),
            );
            if (match && match.label.toLowerCase() !== "near me") {
              geo.setManualLocation({
                label: match.label,
                coords: match.coords,
              });
            }
          }
          handleSearchStateChange(next);
        }}
        onSearch={() => {
          const params = buildBrowseParams();
          window.location.href = `/listings?${params.toString()}`;
        }}
        onRequestLocation={geo.requestLocation}
        onSelectQuickLocation={handleQuickLocation}
        onCreateAlert={handleCreateAlert}
        quickLocations={QUICK_LOCATIONS}
        locationSource={geo.source}
        fallbackLabel={geo.fallbackLabel}
        isLocating={geo.isLoading}
        isAuthenticated={isAuthenticated}
      />

      <StatsBand coords={selectedCoords} initialCounts={initialCounts} />

      <FeaturedListingsSection
        listings={featuredCards}
        viewAllHref={`/listings?featured=true&${buildBrowseParams().toString()}`}
      />

      {nearbyQuery.isError ? (
        <section className="mx-auto w-full max-w-6xl px-6 sm:px-12 lg:px-16">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            We could not refresh nearby listings.
          </div>
        </section>
      ) : null}

      {nearbyQuery.isLoading ? (
        <section className="mx-auto w-full max-w-6xl px-6 sm:px-12 lg:px-16">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-96 rounded-2xl bg-slate-200/70 animate-pulse"
              />
            ))}
          </div>
        </section>
      ) : (
        <ListingsGridSection
          title="Verified homes near you"
          subtitle="Trust scoring, distance, and recency shape your top results."
          listings={nearCards}
          viewAllHref={`/listings?${buildBrowseParams().toString()}`}
          locationLabel={searchState.locationLabel}
        />
      )}

      <section className="mx-auto w-full max-w-6xl px-6 sm:px-12 lg:px-16">
        <AdSlot
          source="home-banner-a"
          adsenseEnabled={Boolean(process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID)}
          unitId={process.env.NEXT_PUBLIC_ADSENSE_FEED_SLOT}
          className="mx-auto max-w-4xl"
          fallbackInhouseAds={inhouseAds}
        />
      </section>

      <ExploreByAreaSection cities={areaCities} popularAreas={areaSuburbs} />

      <TopPartnersSection
        agents={topAgents}
        agencies={topAgencies}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        locationLabel={searchState.locationLabel}
      />

      <section
        id="trust"
        className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 sm:px-12 lg:px-16"
      >
        <div className="flex flex-col gap-3">
          <span className="text-xs uppercase tracking-[0.35em] text-emerald-500">
            How verification works
          </span>
          <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
            Trust-first protections on every listing.
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <ShieldCheck className="h-6 w-6 text-emerald-500" />
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              Verified listings
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Listings earn trust points for photos, GPS, and documentation
              before they rank.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <TrustBadge
              trustScore={82}
              maxScore={110}
              breakdown={{
                photos: true,
                gps: true,
                docs: true,
                siteVisit: false,
              }}
            />
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              In-house chat safety
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Message verified agents instantly and track every conversation
              safely.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <UserCheck className="h-6 w-6 text-emerald-500" />
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              Verified agents
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Agencies and agents earn higher trust scores with verified
              listings and reviews.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/verification"
          className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
        >
          Learn how verification works →
        </Link>
      </section>

      <SavedSearchCTASection
        isAuthenticated={isAuthenticated}
        onCreateAlert={handleCreateAlert}
      />
    </main>
  );
}
