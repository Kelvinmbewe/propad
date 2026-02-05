import { getRequiredPublicApiBaseUrl } from "@/lib/api-base-url";
import type { GeoCoords } from "@/hooks/use-geo-preference";

export interface HomeSearchFilters {
  verifiedOnly?: boolean;
  propertyType?: string;
  priceMin?: number;
  priceMax?: number;
  limit?: number;
}

export interface HomeQueryInput {
  coords: GeoCoords;
  radiusKm?: number;
  filters?: HomeSearchFilters;
}

export interface HomeSearchResult {
  items: any[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  facets?: Record<string, unknown>;
}

export interface HomeAgent {
  id: string;
  name: string | null;
  phone: string | null;
  trustScore: number | null;
  rating: number | null;
  verifiedListingsCount: number;
  averageListingTrust: number;
  profilePhoto?: string | null;
}

export interface HomeAgency {
  id: string;
  name: string;
  trustScore: number | null;
  verifiedListingsCount: number;
  averageListingTrust: number;
  logoUrl?: string | null;
  rating?: number | null;
}

export function buildBoundsString(coords: GeoCoords, radiusKm: number) {
  const latDelta = radiusKm / 110.574;
  const lngDelta = radiusKm / (111.32 * Math.cos((coords.lat * Math.PI) / 180));
  const southWestLat = coords.lat - latDelta;
  const southWestLng = coords.lng - lngDelta;
  const northEastLat = coords.lat + latDelta;
  const northEastLng = coords.lng + lngDelta;

  return [southWestLat, southWestLng, northEastLat, northEastLng]
    .map((value) => value.toFixed(6))
    .join(",");
}

function normalizeSearchResponse(payload: any): HomeSearchResult {
  if (payload?.items) {
    return payload as HomeSearchResult;
  }

  if (payload?.data) {
    const meta = payload.meta ?? {};
    const page = Number(meta.page ?? 1);
    const totalPages = Number(meta.lastPage ?? 1);
    return {
      items: payload.data ?? [],
      page,
      perPage: payload.data?.length ?? 0,
      total: Number(meta.total ?? payload.data?.length ?? 0),
      totalPages,
      hasNextPage: page < totalPages,
      facets: meta.facets ?? {},
    };
  }

  return {
    items: [],
    page: 1,
    perPage: 0,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    facets: {},
  };
}

async function requestSearch(
  params: URLSearchParams,
): Promise<HomeSearchResult> {
  const baseUrl = getRequiredPublicApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/properties/search?${params.toString()}`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error("Failed to load listings");
  }

  const payload = await response.json();
  return normalizeSearchResponse(payload);
}

export async function nearbyVerifiedListings({
  coords,
  radiusKm = 30,
  filters,
}: HomeQueryInput): Promise<HomeSearchResult> {
  const params = new URLSearchParams();
  params.set("bounds", buildBoundsString(coords, radiusKm));
  params.set("limit", String(filters?.limit ?? 18));
  if (filters?.verifiedOnly !== false) {
    params.set("verifiedOnly", "true");
  }
  if (filters?.propertyType) {
    params.set("type", filters.propertyType);
  }
  if (typeof filters?.priceMin === "number") {
    params.set("priceMin", String(filters.priceMin));
  }
  if (typeof filters?.priceMax === "number") {
    params.set("priceMax", String(filters.priceMax));
  }

  return requestSearch(params);
}

export async function featuredListingsNear({
  coords,
  radiusKm = 50,
}: HomeQueryInput): Promise<any[]> {
  const baseUrl = getRequiredPublicApiBaseUrl();
  const response = await fetch(`${baseUrl}/properties/featured`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load featured listings");
  }

  const payload = await response.json();
  if (!Array.isArray(payload)) {
    return [];
  }

  const bounds = buildBoundsString(coords, radiusKm).split(",").map(Number);
  if (bounds.length !== 4) {
    return payload;
  }

  const [swLat, swLng, neLat, neLng] = bounds;
  return payload.filter((listing) => {
    const lat = Number(listing.lat ?? 0);
    const lng = Number(listing.lng ?? 0);
    return lat >= swLat && lat <= neLat && lng >= swLng && lng <= neLng;
  });
}

export async function topAgentsNear({
  coords,
  radiusKm = 40,
  filters,
}: HomeQueryInput): Promise<HomeAgent[]> {
  const baseUrl = getRequiredPublicApiBaseUrl();
  const params = new URLSearchParams();
  params.set("lat", coords.lat.toFixed(6));
  params.set("lng", coords.lng.toFixed(6));
  params.set("radiusKm", String(radiusKm));
  if (filters?.limit) {
    params.set("limit", String(filters.limit));
  }
  const response = await fetch(
    `${baseUrl}/properties/home/top-agents?${params.toString()}`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error("Failed to load top agents");
  }

  return (await response.json()) as HomeAgent[];
}

export async function topAgenciesNear({
  coords,
  radiusKm = 40,
  filters,
}: HomeQueryInput): Promise<HomeAgency[]> {
  const baseUrl = getRequiredPublicApiBaseUrl();
  const params = new URLSearchParams();
  params.set("lat", coords.lat.toFixed(6));
  params.set("lng", coords.lng.toFixed(6));
  params.set("radiusKm", String(radiusKm));
  if (filters?.limit) {
    params.set("limit", String(filters.limit));
  }
  const response = await fetch(
    `${baseUrl}/properties/home/top-agencies?${params.toString()}`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error("Failed to load top agencies");
  }

  return (await response.json()) as HomeAgency[];
}
