"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LandingHero, type HomeSearchState } from "@/components/landing-hero";
import {
  LandingPropertyCard,
  type LandingProperty,
} from "@/components/landing-property-card";
import { AdSlot } from "@/components/ad-slot";
import { TrustBadge, type TrustBreakdown } from "@/components/trust/TrustBadge";
import {
  buildBoundsString,
  nearbyVerifiedListings,
  featuredListingsNear,
  topAgentsNear,
  topAgenciesNear,
  type HomeAgent,
  type HomeAgency,
} from "@/lib/homepage-data";
import {
  DEFAULT_HOME_LOCATION,
  QUICK_LOCATIONS,
  type QuickLocation,
} from "@/lib/homepage-locations";
import { useGeoPreference } from "@/hooks/use-geo-preference";
import { getImageUrl } from "@/lib/image-url";
import { Building2, MapPin, ShieldCheck, UserCheck } from "lucide-react";

const FEATURED_MIN_TRUST = 70;

interface HomePageClientProps {
  initialNearbyListings: any[];
  initialFeaturedListings: any[];
  initialTopAgents: HomeAgent[];
  initialTopAgencies: HomeAgency[];
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

function getPopularAreas(listings: any[]) {
  const counts = new Map<string, number>();
  listings.forEach((listing) => {
    const suburb =
      listing.suburb?.name ||
      listing.location?.suburb?.name ||
      listing.suburbName;
    const city =
      listing.city?.name || listing.location?.city?.name || listing.cityName;
    const label = suburb ? `${suburb}${city ? `, ${city}` : ""}` : city;
    if (label) {
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, count]) => ({ label, count }));
}

export function HomePageClient({
  initialNearbyListings,
  initialFeaturedListings,
  initialTopAgents,
  initialTopAgencies,
}: HomePageClientProps) {
  const geo = useGeoPreference(DEFAULT_HOME_LOCATION);
  const [searchState, setSearchState] = useState<HomeSearchState>({
    intent: "FOR_SALE",
    locationLabel: geo.label,
    propertyType: "any",
    priceRange: "any",
    verifiedOnly: true,
  });
  const [nearbyListings, setNearbyListings] = useState<any[]>(
    initialNearbyListings,
  );
  const [featuredListings, setFeaturedListings] = useState<any[]>(
    initialFeaturedListings,
  );
  const [topAgents, setTopAgents] = useState<HomeAgent[]>(initialTopAgents);
  const [topAgencies, setTopAgencies] =
    useState<HomeAgency[]>(initialTopAgencies);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"agents" | "agencies">("agents");

  useEffect(() => {
    setSearchState((prev) => ({
      ...prev,
      locationLabel: geo.source === "default" ? "Near you" : geo.label,
    }));
  }, [geo.label, geo.source]);

  const selectedCoords = geo.coords;

  const handleSearchStateChange = (next: Partial<HomeSearchState>) => {
    setSearchState((prev) => ({ ...prev, ...next }));
  };

  const handleQuickLocation = (location: QuickLocation) => {
    if (location.label.toLowerCase() === "nearby") {
      geo.requestLocation();
      setSearchState((prev) => ({ ...prev, locationLabel: "Near you" }));
      return;
    }

    geo.setManualLocation({ label: location.label, coords: location.coords });
    setSearchState((prev) => ({ ...prev, locationLabel: location.label }));
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const priceFilters = parsePriceRange(searchState.priceRange);
        const filters = {
          verifiedOnly: searchState.verifiedOnly,
          propertyType:
            searchState.propertyType !== "any"
              ? searchState.propertyType
              : undefined,
          priceMin: priceFilters.priceMin,
          priceMax: priceFilters.priceMax,
          limit: 24,
        };

        const [nearby, featured, agents, agencies] = await Promise.all([
          nearbyVerifiedListings({ coords: selectedCoords, filters }),
          featuredListingsNear({ coords: selectedCoords }),
          topAgentsNear({ coords: selectedCoords, filters: { limit: 6 } }),
          topAgenciesNear({ coords: selectedCoords, filters: { limit: 6 } }),
        ]);

        if (!active) return;

        const filteredByIntent = (nearby.items ?? []).filter((listing) => {
          if (searchState.intent === "TO_RENT")
            return listing.listingIntent === "TO_RENT";
          if (searchState.intent === "FOR_SALE")
            return listing.listingIntent !== "TO_RENT";
          return true;
        });

        const sorted = filteredByIntent
          .slice()
          .sort(
            (a, b) =>
              scoreListing(b, selectedCoords) - scoreListing(a, selectedCoords),
          );

        const featuredFiltered = (featured ?? [])
          .filter(
            (listing) => Number(listing.trustScore ?? 0) >= FEATURED_MIN_TRUST,
          )
          .filter((listing) => {
            if (searchState.intent === "TO_RENT")
              return listing.listingIntent === "TO_RENT";
            if (searchState.intent === "FOR_SALE")
              return listing.listingIntent !== "TO_RENT";
            return true;
          });

        setNearbyListings(sorted);
        setFeaturedListings(featuredFiltered);
        setTopAgents(agents ?? []);
        setTopAgencies(agencies ?? []);
      } catch (error) {
        if (!active) return;
        setLoadError("We could not refresh nearby listings.");
      } finally {
        if (active) setIsLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [
    searchState.intent,
    searchState.priceRange,
    searchState.propertyType,
    searchState.verifiedOnly,
    selectedCoords,
  ]);

  const nearCards = useMemo(
    () => nearbyListings.map(mapToLandingProperty),
    [nearbyListings],
  );
  const featuredCards = useMemo(
    () => featuredListings.map(mapToLandingProperty),
    [featuredListings],
  );
  const popularAreas = useMemo(
    () => getPopularAreas(nearbyListings),
    [nearbyListings],
  );

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

  return (
    <main className="flex flex-col gap-24 pb-24 pt-32">
      <LandingHero
        cards={[
          {
            accent: "TRUSTED LISTINGS",
            title: "Verified first",
            description:
              "Listings are sorted by trust, proximity, and freshness so you see the safest options first.",
          },
          {
            accent: "NEAR YOU",
            title: "Local to your life",
            description:
              "Geo-aware ranking highlights the suburbs and streets closest to you.",
          },
          {
            accent: "PREMIUM VISIBILITY",
            title: "Featured spotlight",
            description:
              "Premium listings stay verified and stand out without sacrificing trust.",
          },
        ]}
        searchState={searchState}
        onSearchStateChange={(next) => {
          if (
            next.locationLabel &&
            next.locationLabel !== searchState.locationLabel
          ) {
            const match = QUICK_LOCATIONS.find(
              (location) =>
                location.label.toLowerCase() ===
                next.locationLabel?.toLowerCase(),
            );
            if (match && match.label.toLowerCase() !== "nearby") {
              geo.setManualLocation({
                label: match.label,
                coords: match.coords,
              });
            }
          }
          handleSearchStateChange(next);
        }}
        onSearch={() => {
          const params = new URLSearchParams();
          params.set(
            "verifiedOnly",
            searchState.verifiedOnly ? "true" : "false",
          );
          if (searchState.propertyType !== "any")
            params.set("type", searchState.propertyType);
          const priceFilters = parsePriceRange(searchState.priceRange);
          if (priceFilters.priceMin)
            params.set("priceMin", String(priceFilters.priceMin));
          if (priceFilters.priceMax)
            params.set("priceMax", String(priceFilters.priceMax));
          if (selectedCoords?.lat && selectedCoords?.lng) {
            params.set("bounds", buildBoundsString(selectedCoords, 30));
          }
          window.location.href = `/properties?${params.toString()}`;
        }}
        onRequestLocation={geo.requestLocation}
        onSelectQuickLocation={handleQuickLocation}
        quickLocations={QUICK_LOCATIONS}
        locationSource={geo.source}
        fallbackLabel={geo.fallbackLabel}
        isLocating={geo.isLoading}
      />

      <section
        id="nearby"
        className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 sm:px-12 lg:px-16"
      >
        <div className="flex flex-col gap-4">
          <span className="text-xs uppercase tracking-[0.35em] text-emerald-500">
            Homes near you (verified)
          </span>
          <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
            Trust-forward listings around {searchState.locationLabel}
          </h2>
          <p className="max-w-2xl text-base text-slate-600">
            Listings are ranked by trust score, proximity, and fresh activity.
            Only verified homes surface by default.
          </p>
        </div>
        {loadError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {loadError}
          </div>
        ) : null}
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-96 rounded-2xl bg-slate-200/70 animate-pulse"
              />
            ))}
          </div>
        ) : nearCards.length ? (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {nearCards.map((property) => (
              <LandingPropertyCard key={property.id} property={property} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
            No verified listings match this area yet. Try another location or
            toggle verified-only off.
          </div>
        )}
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 sm:px-12 lg:px-16">
        <AdSlot
          source="home-banner-a"
          adsenseEnabled={Boolean(process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID)}
          unitId={process.env.NEXT_PUBLIC_ADSENSE_FEED_SLOT}
          className="mx-auto max-w-4xl"
          fallbackInhouseAds={inhouseAds}
        />
      </section>

      {featuredCards.length ? (
        <section
          id="featured"
          className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 sm:px-12 lg:px-16"
        >
          <div className="flex flex-col gap-4">
            <span className="text-xs uppercase tracking-[0.35em] text-amber-500">
              Featured near you
            </span>
            <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
              Premium listings that still meet trust benchmarks
            </h2>
            <p className="max-w-2xl text-base text-slate-600">
              Featured homes are curated for visibility, but still must clear
              minimum verification standards.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {featuredCards.map((property) => (
              <LandingPropertyCard key={property.id} property={property} />
            ))}
          </div>
        </section>
      ) : null}

      <section
        id="explore"
        className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 sm:px-12 lg:px-16"
      >
        <div className="flex flex-col gap-4">
          <span className="text-xs uppercase tracking-[0.35em] text-emerald-500">
            Explore Zimbabwe
          </span>
          <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
            Browse by city and discover popular suburbs
          </h2>
          <p className="max-w-2xl text-base text-slate-600">
            Jump into markets across Zimbabwe or drill into the neighborhoods
            closest to you.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {QUICK_LOCATIONS.filter(
            (location) => location.label !== "Nearby",
          ).map((location) => (
            <Link
              key={location.label}
              href={`/properties?bounds=${encodeURIComponent(buildBoundsString(location.coords, 35))}`}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
                    City
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900">
                    {location.label}
                  </h3>
                </div>
                <MapPin className="h-6 w-6 text-emerald-500" />
              </div>
              <p className="mt-4 text-sm text-slate-600">
                Browse verified listings in {location.label}.
              </p>
            </Link>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {popularAreas.length ? (
            popularAreas.map((area) => (
              <div
                key={area.label}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/60 px-5 py-4"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {area.label}
                  </p>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Popular suburbs
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-600">
                  {area.count} listings
                </span>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              We are still mapping popular suburbs near you.
            </div>
          )}
        </div>
      </section>

      <section
        id="agents"
        className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 sm:px-12 lg:px-16"
      >
        <div className="flex flex-col gap-4">
          <span className="text-xs uppercase tracking-[0.35em] text-emerald-500">
            Top agents and agencies near you
          </span>
          <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
            Work with trusted partners close to {searchState.locationLabel}
          </h2>
          <p className="max-w-2xl text-base text-slate-600">
            Ranked by ratings, verified listings, and average listing trust.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("agents")}
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] ${
              activeTab === "agents"
                ? "bg-emerald-600 text-white"
                : "border border-slate-200 text-slate-600"
            }`}
          >
            Agents
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("agencies")}
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] ${
              activeTab === "agencies"
                ? "bg-emerald-600 text-white"
                : "border border-slate-200 text-slate-600"
            }`}
          >
            Agencies
          </button>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {activeTab === "agents" && topAgents.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              No verified agents are available near this location yet.
            </div>
          ) : null}
          {activeTab === "agencies" && topAgencies.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              No verified agencies are available near this location yet.
            </div>
          ) : null}
          {activeTab === "agents"
            ? topAgents.map((agent) => (
                <Link
                  key={agent.id}
                  href={`/agents/${agent.id}`}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                        Agent
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-slate-900">
                        {agent.name ?? "Verified agent"}
                      </h3>
                    </div>
                    <UserCheck className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>Rating</span>
                    <span className="font-semibold text-slate-900">
                      {agent.rating?.toFixed(1) ?? "0.0"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>Verified listings</span>
                    <span className="font-semibold text-slate-900">
                      {agent.verifiedListingsCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>Avg listing trust</span>
                    <span className="font-semibold text-slate-900">
                      {Math.round(agent.averageListingTrust)}
                    </span>
                  </div>
                </Link>
              ))
            : topAgencies.map((agency) => (
                <Link
                  key={agency.id}
                  href={`/agencies/${agency.id}`}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                        Agency
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-slate-900">
                        {agency.name}
                      </h3>
                    </div>
                    <Building2 className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>Rating</span>
                    <span className="font-semibold text-slate-900">
                      {agency.rating?.toFixed(1) ?? "0.0"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>Verified listings</span>
                    <span className="font-semibold text-slate-900">
                      {agency.verifiedListingsCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>Avg listing trust</span>
                    <span className="font-semibold text-slate-900">
                      {Math.round(agency.averageListingTrust)}
                    </span>
                  </div>
                </Link>
              ))}
        </div>
      </section>

      <section
        id="trust"
        className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 sm:px-12 lg:px-16"
      >
        <div className="flex flex-col gap-4">
          <span className="text-xs uppercase tracking-[0.35em] text-emerald-500">
            Trust explainer
          </span>
          <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
            Trust scoring that keeps your move secure
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
              In-house chat
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
    </main>
  );
}
