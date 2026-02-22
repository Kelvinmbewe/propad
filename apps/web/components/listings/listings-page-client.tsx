"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GeoSuburb, PropertySearchResult } from "@propad/sdk";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button, notify } from "@propad/ui";
import { api } from "@/lib/api-client";
import { DEFAULT_HOME_LOCATION } from "@/lib/homepage-locations";
import {
  distanceKm,
  listingIsFeatured,
  listingTrustScore,
  listingsQueryToUrlParams,
  type ListingsQueryState,
} from "@/lib/listings";
import { useGeoPreference } from "@/hooks/use-geo-preference";
import { useHomeContext } from "@/hooks/use-home-context";
import { useListingsCounts } from "@/hooks/use-listings-counts";
import { useListingsPins } from "@/hooks/use-listings-pins";
import { useListingsSearch } from "@/hooks/use-listings-search";
import { usePopularAreasNear } from "@/hooks/use-popular-areas-near";
import { useCreateSavedSearch } from "@/hooks/use-create-saved-search";
import { ExploreNearbyModules } from "@/components/listings/explore-nearby-modules";
import { ListingsMapPanel } from "@/components/listings/listings-map-panel";
import { ListingsResultsControls } from "@/components/listings/listings-results-controls";
import { ListingsResultsList } from "@/components/listings/listings-results-list";
import { ListingsSearchModule } from "@/components/listings/listings-search-module";
import { ListingsTopBar } from "@/components/listings/listings-top-bar";
import { SavedSearchCTA } from "@/components/listings/saved-search-cta";
import { SponsoredSlot } from "@/components/listings/sponsored-slot";
import type { MapBounds } from "@/components/property-map";
import { useAuthAction } from "@/hooks/use-auth-action";

function parseBoundsString(value: string | undefined): MapBounds | undefined {
  if (!value) return undefined;
  const parts = value.split(",").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part)))
    return undefined;
  const [swLat, swLng, neLat, neLng] = parts as [
    number,
    number,
    number,
    number,
  ];
  return {
    southWest: { lat: swLat, lng: swLng },
    northEast: { lat: neLat, lng: neLng },
  };
}

function formatBounds(bounds: MapBounds) {
  return [
    bounds.southWest.lat,
    bounds.southWest.lng,
    bounds.northEast.lat,
    bounds.northEast.lng,
  ]
    .map((value) => value.toFixed(6))
    .join(",");
}

export function ListingsPageClient({
  initialPage,
  initialQuery,
}: {
  initialPage: PropertySearchResult;
  initialQuery: ListingsQueryState;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const { requireAuth } = useAuthAction();
  const geo = useGeoPreference(DEFAULT_HOME_LOCATION);
  const [awaitingGeo, setAwaitingGeo] = useState(false);
  const [query, setQuery] = useState<ListingsQueryState>(initialQuery);
  const [draft, setDraft] = useState<ListingsQueryState>(initialQuery);
  const [highlightedPropertyId, setHighlightedPropertyId] = useState<
    string | null
  >(null);

  useEffect(() => {
    setQuery(initialQuery);
    setDraft(initialQuery);
  }, [initialQuery]);

  const contextQuery = useHomeContext({
    lat: query.lat,
    lng: query.lng,
    q: query.q,
    locationId: query.locationId,
    locationLevel: query.locationLevel,
  });

  const browsingCenter = useMemo(() => {
    if (typeof query.lat === "number" && typeof query.lng === "number") {
      return { lat: query.lat, lng: query.lng };
    }
    const contextLat = Number(contextQuery.data?.centerLat);
    const contextLng = Number(contextQuery.data?.centerLng);
    if (Number.isFinite(contextLat) && Number.isFinite(contextLng)) {
      return { lat: contextLat, lng: contextLng };
    }
    return geo.coords;
  }, [
    contextQuery.data?.centerLat,
    contextQuery.data?.centerLng,
    geo.coords,
    query.lat,
    query.lng,
  ]);

  const activeLocation = useMemo(
    () =>
      query.q ||
      contextQuery.data?.city ||
      geo.label ||
      DEFAULT_HOME_LOCATION.label,
    [contextQuery.data?.city, geo.label, query.q],
  );

  const syncUrl = useCallback(
    (next: ListingsQueryState) => {
      const search = listingsQueryToUrlParams(next).toString();
      router.replace(search ? `${pathname}?${search}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router],
  );

  const applyQuery = useCallback(
    (patch: Partial<ListingsQueryState>, resetPage = true) => {
      setQuery((prev) => {
        const next = {
          ...prev,
          ...patch,
          page: patch.page ?? (resetPage ? 1 : prev.page),
        };
        syncUrl(next);
        return next;
      });
    },
    [syncUrl],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 420px)");
    const enforceListMode = () => {
      if (media.matches && query.viewMode !== "list") {
        applyQuery({ viewMode: "list" }, false);
      }
    };
    enforceListMode();
    media.addEventListener("change", enforceListMode);
    return () => media.removeEventListener("change", enforceListMode);
  }, [applyQuery, query.viewMode]);

  useEffect(() => {
    if (!awaitingGeo) return;
    if (geo.isLoading) return;
    setAwaitingGeo(false);
    setDraft((prev) => ({
      ...prev,
      q: geo.label,
      lat: geo.coords.lat,
      lng: geo.coords.lng,
      locationId: undefined,
      locationLevel: undefined,
    }));
    applyQuery(
      {
        q: geo.label,
        lat: geo.coords.lat,
        lng: geo.coords.lng,
        locationId: undefined,
        locationLevel: undefined,
      },
      true,
    );
  }, [
    applyQuery,
    awaitingGeo,
    geo.coords.lat,
    geo.coords.lng,
    geo.isLoading,
    geo.label,
  ]);

  const listingsQuery = useListingsSearch({
    query,
    center: browsingCenter,
    initialData:
      JSON.stringify(query) === JSON.stringify(initialQuery)
        ? initialPage
        : undefined,
  });

  const pinsQuery = useListingsPins({ query, center: browsingCenter });

  const suburbsQuery = useQuery<GeoSuburb[]>({
    queryKey: ["geo-suburbs"],
    queryFn: () => api.geo.suburbs(),
    staleTime: 3_600_000,
  });

  const countsQuery = useListingsCounts({
    lat: browsingCenter.lat,
    lng: browsingCenter.lng,
    q: query.q,
    locationId: query.locationId,
    locationLevel: query.locationLevel,
    intent: query.intent,
  });

  const areasQuery = usePopularAreasNear({
    lat: browsingCenter.lat,
    lng: browsingCenter.lng,
    q: query.q,
    locationId: query.locationId,
    locationLevel: query.locationLevel,
    intent: query.intent,
  });

  const saveSearch = useCreateSavedSearch();

  const activeBounds = useMemo(
    () => parseBoundsString(query.bbox),
    [query.bbox],
  );

  const sourceItems = listingsQuery.data?.items ?? [];
  const minTrust = query.minTrust;

  const rankedItems = useMemo(() => {
    const base = sourceItems.filter(
      (item) => listingTrustScore(item) >= minTrust,
    );
    if (!browsingCenter) return base;

    if (query.sort === "RECOMMENDED") {
      const now = Date.now();
      const radiusCap = Math.max(150, query.radiusKm);
      return [...base].sort((a, b) => {
        const score = (item: (typeof base)[number]) => {
          const trust =
            Math.max(0, Math.min(110, listingTrustScore(item))) / 110;
          const createdAt = new Date(item.createdAt ?? 0).getTime();
          const ageDays = Number.isFinite(createdAt)
            ? Math.max(0, (now - createdAt) / (1000 * 60 * 60 * 24))
            : 180;
          const recency = Math.max(0, 1 - ageDays / 45);
          const itemDistance =
            typeof item.location.lat === "number" &&
            typeof item.location.lng === "number"
              ? distanceKm(browsingCenter, {
                  lat: item.location.lat,
                  lng: item.location.lng,
                })
              : radiusCap;
          const distanceScore = Math.max(0, 1 - itemDistance / radiusCap);
          const featuredBoost = listingIsFeatured(item) ? 0.22 : 0;
          const verifiedBoost = ["VERIFIED", "TRUSTED"].includes(
            item.verificationLevel,
          )
            ? 0.12
            : 0;
          const pendingPenalty = item.status === "PENDING_VERIFY" ? -0.2 : 0;
          return (
            trust * 0.45 +
            recency * 0.28 +
            distanceScore * 0.15 +
            featuredBoost +
            verifiedBoost +
            pendingPenalty
          );
        };

        return score(b) - score(a);
      });
    }

    return [...base].sort((a, b) => {
      const aFeatured = listingIsFeatured(a) ? 1 : 0;
      const bFeatured = listingIsFeatured(b) ? 1 : 0;
      if (aFeatured !== bFeatured) return bFeatured - aFeatured;

      if (query.sort === "PRICE_ASC") return Number(a.price) - Number(b.price);
      if (query.sort === "PRICE_DESC") return Number(b.price) - Number(a.price);
      if (query.sort === "NEWEST") {
        return (
          new Date(b.createdAt ?? 0).getTime() -
          new Date(a.createdAt ?? 0).getTime()
        );
      }
      if (query.sort === "TRUST_DESC")
        return listingTrustScore(b) - listingTrustScore(a);

      const aVerified = ["VERIFIED", "TRUSTED"].includes(a.verificationLevel)
        ? 1
        : 0;
      const bVerified = ["VERIFIED", "TRUSTED"].includes(b.verificationLevel)
        ? 1
        : 0;
      if (aVerified !== bVerified) return bVerified - aVerified;
      const aDistance =
        typeof a.location.lat === "number" && typeof a.location.lng === "number"
          ? distanceKm(browsingCenter, {
              lat: a.location.lat,
              lng: a.location.lng,
            })
          : Number.POSITIVE_INFINITY;
      const bDistance =
        typeof b.location.lat === "number" && typeof b.location.lng === "number"
          ? distanceKm(browsingCenter, {
              lat: b.location.lat,
              lng: b.location.lng,
            })
          : Number.POSITIVE_INFINITY;
      if (aDistance !== bDistance) return aDistance - bDistance;
      return listingTrustScore(b) - listingTrustScore(a);
    });
  }, [browsingCenter, minTrust, query.sort, sourceItems]);

  const mapItems = pinsQuery.data ?? rankedItems;
  const loadingListings = listingsQuery.isLoading && !listingsQuery.data;
  const hardError = listingsQuery.isError && !listingsQuery.data;

  const handleSearch = useCallback(() => {
    applyQuery({ ...draft, page: 1 });
  }, [applyQuery, draft]);

  const isAuthenticated = Boolean(session?.user?.id);

  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-6 px-4 pb-8 pt-24 lg:pb-10 lg:pt-28">
      <ListingsTopBar
        intent={query.intent}
        activeLocation={activeLocation}
        total={listingsQuery.data?.total ?? initialPage.total}
        verifiedOnly={query.verifiedOnly}
        radiusKm={query.radiusKm}
        drawAreaEnabled={Boolean(query.bbox)}
        onVerifiedOnlyChange={(next) => {
          setDraft((prev) => ({ ...prev, verifiedOnly: next }));
          applyQuery({ verifiedOnly: next }, true);
        }}
      />

      <SponsoredSlot source="listings-slot-1" compact />

      <ListingsSearchModule
        draft={draft}
        intent={draft.intent}
        onIntentChange={(intent) => {
          setDraft((prev) => ({ ...prev, intent }));
          applyQuery({ intent }, true);
        }}
        onDraftChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
        onUseNearMe={() => {
          setAwaitingGeo(true);
          geo.requestLocation();
        }}
        onSearch={handleSearch}
      />

      <ListingsResultsControls
        sort={query.sort}
        viewMode={query.viewMode}
        cardView={query.cardView}
        page={listingsQuery.data?.page ?? query.page}
        totalPages={listingsQuery.data?.totalPages ?? 1}
        total={listingsQuery.data?.total ?? rankedItems.length}
        onSortChange={(next) => applyQuery({ sort: next }, true)}
        onViewModeChange={(next) => applyQuery({ viewMode: next }, false)}
        onCardViewChange={(next) => applyQuery({ cardView: next }, false)}
        onPageChange={(page) => applyQuery({ page }, false)}
      />

      <section
        className={`grid gap-6 ${
          query.viewMode === "split" ? "lg:grid-cols-[minmax(0,1fr)_420px]" : ""
        }`}
      >
        {query.viewMode !== "map" ? (
          <div className="space-y-5">
            {loadingListings ? (
              <div className="grid gap-4 md:grid-cols-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-80 animate-pulse rounded-2xl bg-slate-100"
                  />
                ))}
              </div>
            ) : hardError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
                <p className="text-sm font-semibold text-red-700">
                  We could not load listings right now.
                </p>
                <Button
                  className="mt-3"
                  onClick={() => listingsQuery.refetch()}
                >
                  Retry
                </Button>
              </div>
            ) : (
              <ListingsResultsList
                items={rankedItems}
                highlightedPropertyId={highlightedPropertyId}
                cardView={query.cardView}
                query={query}
                onHover={setHighlightedPropertyId}
                onLeave={(propertyId) =>
                  setHighlightedPropertyId((current) =>
                    current === propertyId ? null : current,
                  )
                }
                onQuickRadius={(radius) => {
                  setDraft((prev) => ({ ...prev, radiusKm: radius }));
                  applyQuery({ radiusKm: radius, bbox: undefined }, true);
                }}
                onDisableVerified={() => {
                  setDraft((prev) => ({ ...prev, verifiedOnly: false }));
                  applyQuery({ verifiedOnly: false }, true);
                }}
                onTryArea={(area) => {
                  setDraft((prev) => ({
                    ...prev,
                    q: area,
                    locationId: undefined,
                    locationLevel: undefined,
                    bbox: undefined,
                  }));
                  applyQuery(
                    {
                      q: area,
                      locationId: undefined,
                      locationLevel: undefined,
                      bbox: undefined,
                    },
                    true,
                  );
                }}
              />
            )}
          </div>
        ) : null}

        <div className="space-y-4">
          <ListingsMapPanel
            properties={mapItems}
            suburbs={suburbsQuery.data ?? []}
            hoveredPropertyId={highlightedPropertyId}
            activeSuburb={query.q || null}
            activeBounds={activeBounds}
            viewMode={query.viewMode}
            onHoverMarker={setHighlightedPropertyId}
            onSelectMarker={(propertyId) => {
              setHighlightedPropertyId(propertyId);
              const element = document.getElementById(
                `listing-card-${propertyId}`,
              );
              element?.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            }}
            onBoundsSearch={(bounds) => {
              const bbox = formatBounds(bounds);
              setDraft((prev) => ({
                ...prev,
                bbox,
                q: prev.q,
              }));
              applyQuery({ bbox, page: 1 }, true);
            }}
            onSuburbSelect={(suburb) => {
              setDraft((prev) => ({
                ...prev,
                q: suburb.name,
                bbox: undefined,
              }));
              applyQuery({ q: suburb.name, bbox: undefined }, true);
            }}
          />

          <div className="hidden lg:block">
            <SponsoredSlot source="listings-slot-3" />
          </div>
        </div>
      </section>

      <ExploreNearbyModules
        location={activeLocation}
        popularSuburbs={areasQuery.data?.topSuburbs ?? []}
        cities={areasQuery.data?.topCities ?? []}
        market={{
          medianAskingPrice: countsQuery.data?.medianAskingPrice ?? null,
          new30d: countsQuery.data?.newListings30dCount ?? 0,
          verifiedPercent:
            (listingsQuery.data?.total ?? 0) > 0
              ? ((countsQuery.data?.verifiedListingsCount ?? 0) /
                  Math.max(1, listingsQuery.data?.total ?? 1)) *
                100
              : null,
        }}
        onUseQuery={(q) => {
          setDraft((prev) => ({ ...prev, q, bbox: undefined }));
          applyQuery({ q, bbox: undefined }, true);
        }}
      />

      <SavedSearchCTA
        location={activeLocation}
        isAuthenticated={isAuthenticated}
        isSaving={saveSearch.isPending}
        onCreate={() => {
          if (!isAuthenticated) {
            requireAuth({
              returnTo:
                typeof window !== "undefined"
                  ? `${window.location.pathname}${window.location.search}`
                  : "/listings",
            });
            return;
          }
          const priceRange =
            typeof query.priceMin === "number" ||
            typeof query.priceMax === "number"
              ? `${query.priceMin ?? ""}-${query.priceMax ?? ""}`
              : "any";
          saveSearch
            .mutateAsync({
              name: `Listings alert · ${activeLocation}`,
              intent: query.intent,
              locationLabel: activeLocation,
              locationId: query.locationId,
              locationLevel: query.locationLevel,
              propertyType: query.type,
              priceRange,
              verifiedOnly: query.verifiedOnly,
              minTrust: query.minTrust,
              queryJson: query as unknown as Record<string, unknown>,
            })
            .then(() => notify.success("Alert created for this search."))
            .catch(() =>
              notify.error("We could not save this alert. Please try again."),
            );
        }}
      />
    </main>
  );
}
