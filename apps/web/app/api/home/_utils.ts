import { getPublicApiBaseUrl } from "../../../lib/api-base-url";

export const DEFAULT_LIMIT = 12;
export const DEFAULT_RADIUS_KM = 150;
export const FEATURED_MAX_RADIUS_KM = 500;
export const FEATURED_MIN_RESULTS = 6;
export const MIN_TRUST_SCORE = 70;

export type ListingMode = "SALE" | "RENT";
export type BrowsingLocationSource = "GEO" | "SEARCH" | "FALLBACK";

type GeoSearchResult = {
  id: string;
  name: string;
  level: "COUNTRY" | "PROVINCE" | "CITY" | "SUBURB";
  parentId?: string;
  provinceId?: string;
  countryId?: string;
  provinceName?: string;
  cityName?: string;
};

type CityItem = {
  id: string;
  name: string;
  lat?: number | null;
  lng?: number | null;
  province?: { name?: string | null } | null;
};

type SuburbItem = {
  id: string;
  name: string;
  lat?: number | null;
  lng?: number | null;
  city?: { name?: string | null } | null;
  province?: { name?: string | null } | null;
};

export type ResolvedBrowsingLocation = {
  centerLat: number;
  centerLng: number;
  city: string;
  province: string;
  country: string;
  locationId: string | null;
  locationLevel?: string | null;
  source: BrowsingLocationSource;
};

export function parseNumber(value: string | null | undefined) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseBoolean(value: string | null | undefined) {
  if (!value) return undefined;
  return value === "true" || value === "1";
}

export function clampInt(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

export function buildBoundsFromCenter(
  lat: number,
  lng: number,
  radiusKm: number,
) {
  const safeLatCos = Math.max(0.01, Math.cos((lat * Math.PI) / 180));
  const latDelta = radiusKm / 110.574;
  const lngDelta = radiusKm / (111.32 * safeLatCos);
  return {
    southWest: { lat: lat - latDelta, lng: lng - lngDelta },
    northEast: { lat: lat + latDelta, lng: lng + lngDelta },
  };
}

export function buildBoundsString(lat: number, lng: number, radiusKm: number) {
  const bounds = buildBoundsFromCenter(lat, lng, radiusKm);
  return [
    bounds.southWest.lat,
    bounds.southWest.lng,
    bounds.northEast.lat,
    bounds.northEast.lng,
  ]
    .map((value) => value.toFixed(6))
    .join(",");
}

function normalizeApiBaseUrl(baseUrl: string) {
  const withProtocol = baseUrl.startsWith("http")
    ? baseUrl
    : `http://${baseUrl}`;
  const trimmed = withProtocol.replace(/\/+$/, "");
  return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
}

export function getApiBaseUrl() {
  const baseUrl =
    process.env.INTERNAL_API_BASE_URL ||
    process.env.API_URL ||
    getPublicApiBaseUrl() ||
    "http://localhost:3001";
  return normalizeApiBaseUrl(baseUrl);
}

export async function fetchApiJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    cache: "no-store",
    ...init,
  });
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${path}`);
  }
  return (await response.json()) as T;
}

export function mapListingMode(listing: any): ListingMode {
  return listing?.listingIntent === "TO_RENT" ? "RENT" : "SALE";
}

export function mapModeParam(value: string | null | undefined) {
  if (value === "rent") return "RENT" as const;
  if (value === "sale") return "SALE" as const;
  return "ALL" as const;
}

export function getListingTrustBreakdown(listing: any) {
  const mediaCount = Array.isArray(listing?.media) ? listing.media.length : 0;
  const hasGps =
    Number.isFinite(Number(listing?.lat)) &&
    Number.isFinite(Number(listing?.lng));
  const level = String(listing?.verificationLevel ?? "NONE");
  const docs = level === "BASIC" || level === "VERIFIED" || level === "TRUSTED";
  const siteVisit = level === "TRUSTED";
  return {
    photos: mediaCount > 0,
    gps: hasGps,
    docs,
    siteVisit,
  };
}

export function getListingTrustScore(listing: any) {
  const explicit = Number(
    listing?.trustScore ?? listing?.verificationScore ?? 0,
  );
  if (explicit > 0) return explicit;
  const breakdown = getListingTrustBreakdown(listing);
  let score = 0;
  if (breakdown.photos) score += 25;
  if (breakdown.gps) score += 20;
  if (breakdown.docs) score += 25;
  if (breakdown.siteVisit) score += 35;
  const level = listing?.verificationLevel ?? "NONE";
  if (level === "TRUSTED") score = Math.max(score, 90);
  else if (level === "VERIFIED") score = Math.max(score, 80);
  else if (level === "BASIC") score = Math.max(score, 60);
  return score;
}

export function isPublicListing(listing: any) {
  const status = String(listing?.status ?? "").toUpperCase();
  return status === "PUBLISHED" || status === "VERIFIED";
}

export function isVerifiedListing(listing: any, minTrust = MIN_TRUST_SCORE) {
  const level = String(listing?.verificationLevel ?? "NONE").toUpperCase();
  if (level === "VERIFIED" || level === "TRUSTED") return true;
  return getListingTrustScore(listing) >= minTrust;
}

export function getDistanceKm(
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

async function geoSearch(q: string) {
  if (!q.trim()) return [] as GeoSearchResult[];
  return fetchApiJson<GeoSearchResult[]>(
    `/geo/search?q=${encodeURIComponent(q)}&limit=10`,
  );
}

async function resolveCityCoordinates(item: GeoSearchResult) {
  const provinceId = item.provinceId ?? item.parentId;
  if (!provinceId) return null;
  const cities = await fetchApiJson<CityItem[]>(
    `/geo/cities?provinceId=${encodeURIComponent(provinceId)}`,
  );
  const city = cities.find((entry) => entry.id === item.id);
  if (!city || city.lat == null || city.lng == null) return null;
  return {
    lat: city.lat,
    lng: city.lng,
    city: city.name,
    province: city.province?.name ?? item.provinceName ?? "",
    country: "Zimbabwe",
  };
}

async function resolveSuburbCoordinates(item: GeoSearchResult) {
  const cityId = item.parentId;
  if (!cityId) return null;
  const suburbs = await fetchApiJson<SuburbItem[]>(
    `/geo/suburbs?cityId=${encodeURIComponent(cityId)}`,
  );
  const suburb = suburbs.find((entry) => entry.id === item.id);
  if (!suburb || suburb.lat == null || suburb.lng == null) return null;
  return {
    lat: suburb.lat,
    lng: suburb.lng,
    city: suburb.city?.name ?? item.cityName ?? suburb.name,
    province: suburb.province?.name ?? item.provinceName ?? "",
    country: "Zimbabwe",
  };
}

async function resolveFromLocationSearch(input: {
  locationId?: string | null;
  locationLevel?: string | null;
  q?: string | null;
}) {
  const searchText = input.q?.trim() ?? "";
  if (!searchText && !input.locationId) return null;

  const results = await geoSearch(searchText || "Harare");
  if (!results.length) return null;

  let match: GeoSearchResult | undefined;
  if (input.locationId) {
    match = results.find((item) => item.id === input.locationId);
  }
  if (!match && input.locationLevel) {
    match = results.find(
      (item) => item.level === String(input.locationLevel).toUpperCase(),
    );
  }
  if (!match) {
    match =
      results.find((item) => item.level === "SUBURB") ??
      results.find((item) => item.level === "CITY") ??
      results[0];
  }
  if (!match) return null;

  if (match.level === "CITY") {
    const city = await resolveCityCoordinates(match);
    if (!city) return null;
    return { ...city, locationId: match.id, locationLevel: match.level };
  }

  if (match.level === "SUBURB") {
    const suburb = await resolveSuburbCoordinates(match);
    if (!suburb) return null;
    return { ...suburb, locationId: match.id, locationLevel: match.level };
  }

  return null;
}

async function reverseMatchLocation(lat: number, lng: number) {
  try {
    const nearby = await fetchApiJson<{
      cities?: Array<{
        name: string;
        province?: string;
        lat?: number;
        lng?: number;
      }>;
    }>(
      `/properties/home/areas?lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}&radiusKm=50&limitCities=6&limitSuburbs=0`,
    );
    const cities = nearby?.cities ?? [];
    if (!cities.length) return null;
    const best = cities
      .filter(
        (item) => typeof item.lat === "number" && typeof item.lng === "number",
      )
      .map((item) => ({
        ...item,
        distanceKm: getDistanceKm(
          { lat, lng },
          { lat: Number(item.lat), lng: Number(item.lng) },
        ),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)[0];
    if (!best) return null;
    return {
      city: best.name,
      province: best.province ?? "",
      country: "Zimbabwe",
    };
  } catch {
    return null;
  }
}

export async function resolveBrowsingLocation(params: {
  lat?: number;
  lng?: number;
  locationId?: string | null;
  locationLevel?: string | null;
  q?: string | null;
  fallbackCity?: string;
}): Promise<ResolvedBrowsingLocation> {
  const fallbackCity = params.fallbackCity ?? "Harare";

  if (params.locationId || params.q) {
    const searched = await resolveFromLocationSearch({
      locationId: params.locationId,
      locationLevel: params.locationLevel,
      q: params.q,
    });
    if (searched) {
      return {
        centerLat: searched.lat,
        centerLng: searched.lng,
        city: searched.city,
        province: searched.province,
        country: searched.country,
        locationId: searched.locationId,
        locationLevel: (searched as any).locationLevel,
        source: "SEARCH",
      };
    }
  }

  if (typeof params.lat === "number" && typeof params.lng === "number") {
    const reverse = await reverseMatchLocation(params.lat, params.lng);
    return {
      centerLat: params.lat,
      centerLng: params.lng,
      city: reverse?.city ?? "Near me",
      province: reverse?.province ?? "",
      country: reverse?.country ?? "Zimbabwe",
      locationId: null,
      source: "GEO",
    };
  }

  const fallback = await resolveFromLocationSearch({ q: fallbackCity });
  if (fallback) {
    return {
      centerLat: fallback.lat,
      centerLng: fallback.lng,
      city: fallback.city,
      province: fallback.province,
      country: fallback.country,
      locationId: fallback.locationId,
      source: "FALLBACK",
    };
  }

  return {
    centerLat: -17.8252,
    centerLng: 31.0335,
    city: fallbackCity,
    province: "Harare",
    country: "Zimbabwe",
    locationId: null,
    source: "FALLBACK",
  };
}

export async function fetchPropertiesInRadius(params: {
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  mode?: "SALE" | "RENT" | "ALL";
  verifiedOnly?: boolean;
  limit?: number;
  type?: string;
  priceMin?: number;
  priceMax?: number;
  locationId?: string | null;
  locationLevel?: string | null;
}) {
  const cap = Math.max(60, (params.limit ?? 12) * 8);
  const pages = Math.ceil(Math.min(150, cap) / 50);
  const bounds = buildBoundsString(
    params.centerLat,
    params.centerLng,
    params.radiusKm,
  );

  const query = new URLSearchParams();

  // Use explicit location filtering if available (City/Suburb)
  if (params.locationId) {
    if (params.locationLevel === "CITY") {
      query.set("cityId", params.locationId);
    } else if (params.locationLevel === "SUBURB") {
      query.set("suburbId", params.locationId);
    }
  }

  // Also pass bounds as fallback/constraint
  query.set("bounds", bounds);
  query.set("limit", String(Math.min(100, (params.limit ?? 12) * 4))); // fetch slightly more to allow client sorting? Actually server does it now.

  if (params.verifiedOnly) {
    query.set("verifiedOnly", "true");
  }

  if (params.mode === "SALE") query.set("listingIntent", "FOR_SALE");
  if (params.mode === "RENT") query.set("listingIntent", "TO_RENT");

  if (params.type) query.set("type", params.type);
  if (typeof params.priceMin === "number") query.set("priceMin", String(params.priceMin));
  if (typeof params.priceMax === "number") query.set("priceMax", String(params.priceMax));

  const payload = await fetchApiJson<{ data?: any[]; items?: any[] }>(
    `/properties/search?${query.toString()}`,
  );

  const all = payload.data ?? payload.items ?? [];
  const mode = params.mode ?? "ALL";

  return all
    .filter((listing) => isPublicListing(listing))
    .map((listing) => {
      const lat = Number(listing.lat ?? listing.location?.lat ?? NaN);
      const lng = Number(listing.lng ?? listing.location?.lng ?? NaN);
      const distanceKm =
        Number.isFinite(lat) && Number.isFinite(lng)
          ? getDistanceKm(
            { lat: params.centerLat, lng: params.centerLng },
            { lat, lng },
          )
          : Number.POSITIVE_INFINITY;
      const trustScore = getListingTrustScore(listing);
      const listingMode = mapListingMode(listing);
      return {
        ...listing,
        lat,
        lng,
        distanceKm,
        trustScore,
        trustBreakdown: getListingTrustBreakdown(listing),
        listingMode,
      };
    })
    // Server filtering should handle most logic, but we keep radius check
    .filter((listing) => {
      // Only filter radius if we didn't search by explicit ID (or if we want strict radius)
      // Let's enforce radius always for "Nearby" logic
      return listing.distanceKm <= params.radiusKm;
    });
}
