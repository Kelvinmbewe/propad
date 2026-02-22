"use client";

import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Button } from "@propad/ui";
import { AdSlot } from "@/components/ad-slot";
import { AgencyCard } from "@/app/agencies/_components/agency-card";
import { AgenciesMapPreview } from "@/app/agencies/_components/agencies-map-preview";

const QUICK_CITIES = [
  { name: "Harare", lat: -17.8252, lng: 31.0335 },
  { name: "Bulawayo", lat: -20.1539, lng: 28.588 },
  { name: "Gweru", lat: -19.455, lng: 29.817 },
  { name: "Mutare", lat: -18.9707, lng: 32.6709 },
  { name: "Victoria Falls", lat: -17.9243, lng: 25.856 },
  { name: "Kwekwe", lat: -18.9282, lng: 29.8149 },
];

type AgenciesResponse = {
  items: any[];
  nextCursor: string | null;
  popularAreas: Array<{ name: string; count: number }>;
  meta: {
    center: { lat: number; lng: number };
    radiusKm: number;
    totals: {
      agenciesNearYou: number;
      verifiedAgencies: number;
      verifiedListings: number;
      avgTrust: number;
    };
  };
};

function useLocationSuggestions(query: string) {
  return useQuery({
    queryKey: ["agency-location-suggestions", query],
    queryFn: async () => {
      const response = await fetch(
        `/api/agencies?suggest=1&q=${encodeURIComponent(query)}`,
      );
      if (!response.ok) throw new Error("Failed to load suggestions");
      return (await response.json()) as { items: any[] };
    },
    enabled: query.trim().length >= 2,
    staleTime: 60_000,
  });
}

function useAgenciesQuery(params: Record<string, string>) {
  return useInfiniteQuery({
    queryKey: ["agencies-discovery", params],
    queryFn: async ({ pageParam }) => {
      const search = new URLSearchParams(params);
      search.set("cursor", String(pageParam ?? "0"));
      const response = await fetch(`/api/agencies?${search.toString()}`);
      if (!response.ok) throw new Error("Failed to load agencies");
      return (await response.json()) as AgenciesResponse;
    },
    initialPageParam: "0",
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function AgenciesDiscoveryClient() {
  const [lat, setLat] = useState<number>(-17.8252);
  const [lng, setLng] = useState<number>(31.0335);
  const [radiusKm, setRadiusKm] = useState(150);
  const [q, setQ] = useState("");
  const [province, setProvince] = useState("");
  const [service, setService] = useState<"" | "SALES" | "LETTINGS">("");
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [minTrust, setMinTrust] = useState(35);
  const [minRating, setMinRating] = useState(3);
  const [sort, setSort] = useState<
    "RECOMMENDED" | "TRUST" | "RATING" | "MOST_LISTINGS" | "NEAREST"
  >("RECOMMENDED");
  const [shortlist, setShortlist] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("agencies:last-location");
      if (stored) {
        const parsed = JSON.parse(stored) as { lat?: number; lng?: number };
        if (typeof parsed.lat === "number" && typeof parsed.lng === "number") {
          setLat(parsed.lat);
          setLng(parsed.lng);
          return;
        }
      }

      const profileStored = localStorage.getItem("profile:location");
      if (profileStored) {
        const parsed = JSON.parse(profileStored) as {
          lat?: number;
          lng?: number;
        };
        if (typeof parsed.lat === "number" && typeof parsed.lng === "number") {
          setLat(parsed.lat);
          setLng(parsed.lng);
        }
      }
    } catch {
      // keep defaults
    }
  }, []);

  const params = useMemo(() => {
    const search = new URLSearchParams();
    search.set("lat", String(lat));
    search.set("lng", String(lng));
    search.set("radiusKm", String(radiusKm));
    if (q.trim()) search.set("q", q.trim());
    if (province.trim()) search.set("province", province.trim());
    if (service) search.set("service", service);
    search.set("verifiedOnly", verifiedOnly ? "true" : "false");
    search.set("minTrust", String(minTrust));
    search.set("minRating", String(minRating));
    search.set("sort", sort);
    search.set("take", "12");
    return Object.fromEntries(search.entries());
  }, [
    lat,
    lng,
    radiusKm,
    q,
    province,
    service,
    verifiedOnly,
    minTrust,
    minRating,
    sort,
  ]);

  const agenciesQuery = useAgenciesQuery(params);
  const suggestionsQuery = useLocationSuggestions(q);

  const agencies =
    agenciesQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const latestMeta =
    agenciesQuery.data?.pages[agenciesQuery.data.pages.length - 1]?.meta;
  const popularAreas =
    agenciesQuery.data?.pages[agenciesQuery.data.pages.length - 1]
      ?.popularAreas ?? [];

  const shortlistItems = agencies.filter((item) => shortlist.includes(item.id));

  const agentsNearQuery = useQuery({
    queryKey: ["agents-near-you", lat, lng, radiusKm],
    queryFn: async () => {
      const response = await fetch(
        `/api/agents?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}&limit=6`,
      );
      if (!response.ok) throw new Error("Failed to load nearby agents");
      return (await response.json()) as { items: any[] };
    },
    staleTime: 120_000,
  });

  const onUseMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setLat(next.lat);
        setLng(next.lng);
        localStorage.setItem("agencies:last-location", JSON.stringify(next));
      },
      () => {
        // keep default/fallback
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 180_000 },
    );
  };

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 pb-12 pt-24 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-border bg-card p-6 text-card-foreground">
        <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">
          Find trusted agencies near you
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Zimbabwe-focused agency discovery with verified listings, trust
          scoring, and fast messaging.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search city, suburb, town, or agency"
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
            />
            {suggestionsQuery.data?.items?.length ? (
              <div className="flex flex-wrap gap-2">
                {suggestionsQuery.data.items.slice(0, 6).map((item: any) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setQ(item.label)}
                    className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <Button variant="secondary" onClick={onUseMyLocation}>
            Use my location
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_CITIES.map((city) => (
            <button
              key={city.name}
              type="button"
              onClick={() => {
                setQ(city.name);
                setLat(city.lat);
                setLng(city.lng);
                localStorage.setItem(
                  "agencies:last-location",
                  JSON.stringify({ lat: city.lat, lng: city.lng }),
                );
              }}
              className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              {city.name}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-background p-3 text-sm">
            <p className="text-muted-foreground">Agencies near you</p>
            <p className="mt-1 text-xl font-semibold text-foreground">
              {latestMeta?.totals.agenciesNearYou ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background p-3 text-sm">
            <p className="text-muted-foreground">Verified agencies</p>
            <p className="mt-1 text-xl font-semibold text-foreground">
              {latestMeta?.totals.verifiedAgencies ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background p-3 text-sm">
            <p className="text-muted-foreground">Verified listings</p>
            <p className="mt-1 text-xl font-semibold text-foreground">
              {latestMeta?.totals.verifiedListings ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background p-3 text-sm">
            <p className="text-muted-foreground">Average trust</p>
            <p className="mt-1 text-xl font-semibold text-foreground">
              {Math.round(latestMeta?.totals.avgTrust ?? 0)}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-border bg-card p-4 text-card-foreground">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Province</span>
                <input
                  value={province}
                  onChange={(event) => setProvince(event.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-2"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Service</span>
                <select
                  value={service}
                  onChange={(event) => setService(event.target.value as any)}
                  className="h-9 w-full rounded-md border border-input bg-background px-2"
                >
                  <option value="">All services</option>
                  <option value="SALES">Sales</option>
                  <option value="LETTINGS">Lettings</option>
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Radius</span>
                <select
                  value={radiusKm}
                  onChange={(event) => setRadiusKm(Number(event.target.value))}
                  className="h-9 w-full rounded-md border border-input bg-background px-2"
                >
                  {[25, 50, 150, 300, 500].map((radius) => (
                    <option key={radius} value={radius}>
                      {radius}km
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Sort</span>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as any)}
                  className="h-9 w-full rounded-md border border-input bg-background px-2"
                >
                  <option value="RECOMMENDED">Recommended</option>
                  <option value="TRUST">Trust</option>
                  <option value="RATING">Rating</option>
                  <option value="MOST_LISTINGS">Most listings</option>
                  <option value="NEAREST">Nearest</option>
                </select>
              </label>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Verified only</span>
                <select
                  value={verifiedOnly ? "true" : "false"}
                  onChange={(event) =>
                    setVerifiedOnly(event.target.value === "true")
                  }
                  className="h-9 w-full rounded-md border border-input bg-background px-2"
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">
                  Minimum trust: {minTrust}
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={minTrust}
                  onChange={(event) => setMinTrust(Number(event.target.value))}
                  className="w-full"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">
                  Minimum rating: {minRating.toFixed(1)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={0.5}
                  value={minRating}
                  onChange={(event) => setMinRating(Number(event.target.value))}
                  className="w-full"
                />
              </label>
            </div>
          </section>

          {agenciesQuery.isError ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
              Could not load agencies right now.
              <div className="mt-3">
                <Button size="sm" onClick={() => agenciesQuery.refetch()}>
                  Retry
                </Button>
              </div>
            </div>
          ) : null}

          {!agenciesQuery.isLoading && !agencies.length ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
              No agencies matched your filters.
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setRadiusKm(300)}
                >
                  Increase radius to 300km
                </Button>
                {QUICK_CITIES.slice(0, 4).map((city) => (
                  <Button
                    key={`empty-${city.name}`}
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setQ(city.name);
                      setLat(city.lat);
                      setLng(city.lng);
                    }}
                  >
                    {city.name}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-4">
            {agencies.map((agency) => (
              <AgencyCard
                key={agency.id}
                agency={agency}
                isShortlisted={shortlist.includes(agency.id)}
                onToggleShortlist={(id) => {
                  setShortlist((current) => {
                    if (current.includes(id)) {
                      return current.filter((item) => item !== id);
                    }
                    if (current.length >= 3) return current;
                    return [...current, id];
                  });
                }}
              />
            ))}
          </div>

          {agenciesQuery.hasNextPage ? (
            <div className="flex justify-center">
              <Button
                variant="secondary"
                onClick={() => agenciesQuery.fetchNextPage()}
                disabled={agenciesQuery.isFetchingNextPage}
              >
                {agenciesQuery.isFetchingNextPage
                  ? "Loading..."
                  : "Load more agencies"}
              </Button>
            </div>
          ) : null}

          <section className="rounded-2xl border border-border bg-card p-5 text-card-foreground">
            <h2 className="text-lg font-semibold text-foreground">
              Popular agency areas near you
            </h2>
            {popularAreas.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {popularAreas.map((area) => (
                  <button
                    key={area.name}
                    type="button"
                    onClick={() => setQ(area.name)}
                    className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground"
                  >
                    {area.name} ({area.count})
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Area insights appear as more agencies are discovered.
              </p>
            )}
          </section>

          <AdSlot
            source="agencies-feed"
            adsenseEnabled={Boolean(process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID)}
            unitId={process.env.NEXT_PUBLIC_ADSENSE_FEED_SLOT}
            className="mx-auto w-full"
            fallbackInhouseAds={[
              {
                id: "agency-spotlight",
                title: "Want your agency featured first?",
                body: "Increase visibility by completing verification and improving listing trust.",
                ctaLabel: "Boost agency",
                href: "/dashboard/agency",
                tone: "slate",
              },
            ]}
          />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
          <AgenciesMapPreview center={{ lat, lng }} items={agencies} />

          <section className="rounded-2xl border border-border bg-card p-4 text-card-foreground">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Compare agencies
            </h3>
            {shortlistItems.length ? (
              <div className="mt-3 space-y-2">
                {shortlistItems.map((agency) => (
                  <div
                    key={`short-${agency.id}`}
                    className="rounded-lg border border-border bg-background px-3 py-2"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {agency.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Trust {Math.round(agency.trustScore)} | Listings{" "}
                      {agency.stats.activeListingsCount}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Add up to 3 agencies to compare side by side.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 text-card-foreground">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Agents near you
            </h3>
            <div className="mt-3 space-y-2">
              {(agentsNearQuery.data?.items ?? [])
                .slice(0, 6)
                .map((agent: any) => (
                  <a
                    key={agent.id}
                    href={`/profiles/users/${agent.id}`}
                    className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm hover:border-emerald-300"
                  >
                    <span className="font-medium text-foreground">
                      {agent.name ?? "Agent"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Trust {Math.round(Number(agent.trustScore ?? 0))}
                    </span>
                  </a>
                ))}
              {!agentsNearQuery.isLoading &&
              !(agentsNearQuery.data?.items ?? []).length ? (
                <p className="text-sm text-muted-foreground">
                  No nearby agents available right now.
                </p>
              ) : null}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
