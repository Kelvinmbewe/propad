import type { Property, PropertySearchResult } from "@propad/sdk";

export type ListingsIntent = "FOR_SALE" | "TO_RENT";
export type ListingsSort =
  | "RECOMMENDED"
  | "NEWEST"
  | "PRICE_ASC"
  | "PRICE_DESC"
  | "TRUST_DESC";
export type ListingsViewMode = "list" | "map" | "split";
export type ListingsCardView = "grid" | "list";

export interface ListingsQueryState {
  intent: ListingsIntent;
  q: string;
  locationId?: string;
  locationLevel?: string;
  lat?: number;
  lng?: number;
  radiusKm: 150 | 300 | 500;
  type?: string;
  priceMin?: number;
  priceMax?: number;
  bedrooms?: number;
  bathrooms?: number;
  verifiedOnly: boolean;
  minTrust: number;
  sort: ListingsSort;
  viewMode: ListingsViewMode;
  cardView: ListingsCardView;
  bbox?: string;
  page: number;
  limit: number;
}

export const DEFAULT_LISTINGS_QUERY: ListingsQueryState = {
  intent: "FOR_SALE",
  q: "",
  radiusKm: 150,
  verifiedOnly: true,
  minTrust: 60,
  sort: "RECOMMENDED",
  viewMode: "split",
  cardView: "grid",
  page: 1,
  limit: 18,
};

function parseNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (!value) return undefined;
  return value === "true" || value === "1";
}

function parseRadius(value: string | undefined): 150 | 300 | 500 {
  if (value === "300") return 300;
  if (value === "500") return 500;
  return 150;
}

function clampInt(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function validIntent(value: string | undefined): ListingsIntent {
  return value === "TO_RENT" ? "TO_RENT" : "FOR_SALE";
}

function validSort(value: string | undefined): ListingsSort {
  switch (value) {
    case "NEWEST":
    case "PRICE_ASC":
    case "PRICE_DESC":
    case "TRUST_DESC":
      return value;
    default:
      return "RECOMMENDED";
  }
}

function validViewMode(value: string | undefined): ListingsViewMode {
  if (value === "list" || value === "map") return value;
  return "split";
}

function validCardView(value: string | undefined): ListingsCardView {
  return value === "list" ? "list" : "grid";
}

export function parseListingsQuery(
  params: Record<string, string | undefined>,
): ListingsQueryState {
  const intent = validIntent(params.intent);
  const verifiedOnly = parseBoolean(params.verifiedOnly);
  return {
    intent,
    q: params.q?.trim() ?? "",
    locationId: params.locationId?.trim() || undefined,
    locationLevel: params.locationLevel?.trim() || undefined,
    lat: parseNumber(params.lat),
    lng: parseNumber(params.lng),
    radiusKm: parseRadius(params.radiusKm),
    type: params.type?.trim() || undefined,
    priceMin: parseNumber(params.priceMin),
    priceMax: parseNumber(params.priceMax),
    bedrooms: parseNumber(params.bedrooms),
    bathrooms: parseNumber(params.bathrooms),
    verifiedOnly: verifiedOnly ?? true,
    minTrust: clampInt(parseNumber(params.minTrust), 60, 0, 110),
    sort: validSort(params.sort),
    viewMode: validViewMode(params.viewMode),
    cardView: validCardView(params.cardView),
    bbox: params.bbox?.trim() || undefined,
    page: clampInt(parseNumber(params.page), 1, 1, 999),
    limit: clampInt(parseNumber(params.limit), 18, 6, 60),
  };
}

export function listingsQueryToUrlParams(
  state: ListingsQueryState,
): URLSearchParams {
  const search = new URLSearchParams();
  search.set("intent", state.intent);
  if (state.q) search.set("q", state.q);
  if (state.locationId) search.set("locationId", state.locationId);
  if (state.locationLevel) search.set("locationLevel", state.locationLevel);
  if (typeof state.lat === "number") search.set("lat", state.lat.toFixed(6));
  if (typeof state.lng === "number") search.set("lng", state.lng.toFixed(6));
  search.set("radiusKm", String(state.radiusKm));
  if (state.type) search.set("type", state.type);
  if (typeof state.priceMin === "number")
    search.set("priceMin", String(state.priceMin));
  if (typeof state.priceMax === "number")
    search.set("priceMax", String(state.priceMax));
  if (typeof state.bedrooms === "number")
    search.set("bedrooms", String(state.bedrooms));
  if (typeof state.bathrooms === "number")
    search.set("bathrooms", String(state.bathrooms));
  search.set("verifiedOnly", state.verifiedOnly ? "true" : "false");
  search.set("minTrust", String(state.minTrust));
  search.set("sort", state.sort);
  search.set("viewMode", state.viewMode);
  search.set("cardView", state.cardView);
  if (state.bbox) search.set("bbox", state.bbox);
  search.set("page", String(state.page));
  search.set("limit", String(state.limit));
  return search;
}

function buildBoundsFromCenter(lat: number, lng: number, radiusKm: number) {
  const safeLatCos = Math.max(0.01, Math.cos((lat * Math.PI) / 180));
  const latDelta = radiusKm / 110.574;
  const lngDelta = radiusKm / (111.32 * safeLatCos);
  return {
    southWest: { lat: lat - latDelta, lng: lng - lngDelta },
    northEast: { lat: lat + latDelta, lng: lng + lngDelta },
  };
}

function formatBounds(bounds: {
  southWest: { lat: number; lng: number };
  northEast: { lat: number; lng: number };
}) {
  return [
    bounds.southWest.lat,
    bounds.southWest.lng,
    bounds.northEast.lat,
    bounds.northEast.lng,
  ]
    .map((value) => value.toFixed(6))
    .join(",");
}

function mapSortToApi(sort: ListingsSort): string {
  if (sort === "RECOMMENDED") return "RELEVANCE";
  return sort;
}

export function buildListingsSearchApiParams(
  state: ListingsQueryState,
  center?: { lat: number; lng: number },
): URLSearchParams {
  const params = new URLSearchParams();
  params.set("page", String(state.page));
  params.set("limit", String(state.limit));
  params.set("listingIntent", state.intent);
  params.set("sort", mapSortToApi(state.sort));
  if (state.type) params.set("type", state.type);
  if (typeof state.priceMin === "number")
    params.set("priceMin", String(state.priceMin));
  if (typeof state.priceMax === "number")
    params.set("priceMax", String(state.priceMax));
  if (typeof state.bedrooms === "number")
    params.set("bedrooms", String(state.bedrooms));
  if (typeof state.bathrooms === "number")
    params.set("bathrooms", String(state.bathrooms));
  if (state.verifiedOnly) params.set("verifiedOnly", "true");

  if (state.bbox) {
    params.set("bounds", state.bbox);
  } else if (center) {
    params.set(
      "bounds",
      formatBounds(
        buildBoundsFromCenter(center.lat, center.lng, state.radiusKm),
      ),
    );
  }

  if (state.locationId) {
    if (state.locationLevel === "CITY") params.set("cityId", state.locationId);
    if (state.locationLevel === "SUBURB")
      params.set("suburbId", state.locationId);
    if (state.locationLevel === "PROVINCE")
      params.set("provinceId", state.locationId);
  }

  return params;
}

const defaultFacets: PropertySearchResult["facets"] = {
  price: { min: 0, max: 0 },
  types: [],
  suburbs: [],
};

export function normalizePropertySearchResult(
  payload: unknown,
  fallback: { page: number; perPage: number },
): PropertySearchResult {
  const source = payload as Record<string, unknown> | null;
  if (source && Array.isArray(source.items)) {
    const page = Number(source.page ?? fallback.page) || fallback.page;
    const perPage =
      Number(source.perPage ?? fallback.perPage) || fallback.perPage;
    const total = Number(source.total ?? source.items.length) || 0;
    const totalPages =
      Number(source.totalPages ?? Math.ceil(total / perPage)) || 0;
    const hasNextPage = Boolean(source.hasNextPage ?? page < totalPages);
    return {
      items: source.items as Property[],
      page,
      perPage,
      total,
      totalPages,
      hasNextPage,
      facets:
        (source.facets as PropertySearchResult["facets"]) ?? defaultFacets,
    };
  }

  if (source && Array.isArray(source.data)) {
    const meta = (source.meta as Record<string, unknown> | undefined) ?? {};
    const page = Number(meta.page ?? fallback.page) || fallback.page;
    const perPage =
      Number(meta.perPage ?? fallback.perPage) || fallback.perPage;
    const total = Number(meta.total ?? source.data.length) || 0;
    const totalPages = Number(meta.lastPage ?? Math.ceil(total / perPage)) || 0;
    return {
      items: source.data as Property[],
      page,
      perPage,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      facets: defaultFacets,
    };
  }

  return {
    items: [],
    page: fallback.page,
    perPage: fallback.perPage,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    facets: defaultFacets,
  };
}

export function listingTrustScore(property: Property): number {
  const source = property as Property & {
    trustScore?: number | null;
    verificationScore?: number | null;
    verificationLevel?: string | null;
  };
  const explicit = Number(source.trustScore ?? source.verificationScore ?? 0);
  if (explicit > 0) return explicit;
  const level = source.verificationLevel ?? "NONE";
  if (level === "TRUSTED") return 90;
  if (level === "VERIFIED") return 80;
  if (level === "BASIC") return 60;
  return 0;
}

export function listingIsFeatured(property: Property): boolean {
  const source = property as Property & {
    featuredListing?: { status?: string | null } | null;
    isFeatured?: boolean | null;
  };
  return Boolean(
    source.isFeatured || source.featuredListing?.status === "ACTIVE",
  );
}

export function listingVerificationBreakdown(property: Property) {
  const mediaCount = Array.isArray(property.media) ? property.media.length : 0;
  const hasGps =
    Number.isFinite(Number(property.location.lat)) &&
    Number.isFinite(Number(property.location.lng));
  const level = String(
    (property as Property & { verificationLevel?: string | null })
      .verificationLevel ?? "NONE",
  );
  return {
    photos: mediaCount > 0,
    gps: hasGps,
    docs: level === "BASIC" || level === "VERIFIED" || level === "TRUSTED",
    siteVisit: level === "TRUSTED",
  };
}

export function distanceKm(
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
