import { NextResponse } from "next/server";
import {
  DEFAULT_LIMIT,
  MIN_TRUST_SCORE,
  buildBoundsString,
  getApiBaseUrl,
  getDistanceKm,
  getListingTrustScore,
  isPublicListing,
  isVerifiedListing,
  parseBoolean,
  parseNumber,
} from "../../_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

async function resolveLocationId(city: string) {
  const response = await fetch(
    `${getApiBaseUrl()}/geo/search?q=${encodeURIComponent(city)}`,
    { cache: "no-store" },
  );
  if (!response.ok) return null;
  const results = (await response.json()) as Array<{
    id: string;
    level: string;
  }>;
  const suburb = results.find((item) => item.level === "SUBURB");
  if (suburb) return { suburbId: suburb.id };
  const cityMatch = results.find((item) => item.level === "CITY");
  if (cityMatch) return { cityId: cityMatch.id };
  const province = results.find((item) => item.level === "PROVINCE");
  if (province) return { provinceId: province.id };
  return null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const debug = url.searchParams.get("debug") === "1";
  const lat = parseNumber(url.searchParams.get("lat"));
  const lng = parseNumber(url.searchParams.get("lng"));
  const radiusKm = parseNumber(url.searchParams.get("radiusKm")) ?? 150;
  const limit = parseNumber(url.searchParams.get("limit")) ?? DEFAULT_LIMIT;
  const verifiedOnly =
    parseBoolean(url.searchParams.get("verifiedOnly")) ?? true;
  const minTrust =
    parseNumber(url.searchParams.get("minTrust")) ?? MIN_TRUST_SCORE;
  const mode = url.searchParams.get("mode") ?? "all";
  const city = url.searchParams.get("city");
  const locationId = url.searchParams.get("locationId");
  const locationLevel = url.searchParams.get("locationLevel");
  const propertyType = url.searchParams.get("propertyType");
  const priceMin = parseNumber(url.searchParams.get("priceMin"));
  const priceMax = parseNumber(url.searchParams.get("priceMax"));

  const params = new URLSearchParams();
  params.set("limit", String(limit));
  // Do not pass verifiedOnly to API; we filter by trust score locally
  if (propertyType) params.set("type", propertyType);
  if (priceMin !== undefined) params.set("priceMin", String(priceMin));
  if (priceMax !== undefined) params.set("priceMax", String(priceMax));
  if (locationId && locationLevel) {
    if (locationLevel === "CITY") params.set("cityId", locationId);
    if (locationLevel === "SUBURB") params.set("suburbId", locationId);
    if (locationLevel === "PROVINCE") params.set("provinceId", locationId);
  } else if (lat !== undefined && lng !== undefined) {
    params.set("bounds", buildBoundsString(lat, lng, radiusKm));
  } else if (city) {
    const locationMatch = await resolveLocationId(city);
    if (locationMatch?.cityId) params.set("cityId", locationMatch.cityId);
    if (locationMatch?.suburbId) params.set("suburbId", locationMatch.suburbId);
    if (locationMatch?.provinceId)
      params.set("provinceId", locationMatch.provinceId);
  }

  let payload: any = null;
  let debugError: string | null = null;
  try {
    const response = await fetch(
      `${getApiBaseUrl()}/properties/search?${params.toString()}`,
      { cache: "no-store" },
    );
    if (!response.ok) {
      throw new Error(`Nearby request failed: ${response.status}`);
    }
    payload = await response.json();
  } catch (error) {
    debugError = error instanceof Error ? error.message : String(error);
    console.error("[home/nearby]", error);
    return NextResponse.json({
      items: [],
      ...(debug
        ? {
          debug: {
            error: debugError,
            baseUrl: getApiBaseUrl(),
            params: Object.fromEntries(params.entries()),
          },
        }
        : {}),
    });
  }
  const items = payload?.data ?? payload?.items ?? [];

  const filtered = items
    .filter((listing: any) => isPublicListing(listing))
    .filter((listing: any) =>
      verifiedOnly ? isVerifiedListing(listing, minTrust) : true,
    )
    .filter((listing: any) => {
      if (mode === "sale") return listing.listingIntent !== "TO_RENT";
      if (mode === "rent") return listing.listingIntent === "TO_RENT";
      return true;
    })
    .map((listing: any) => {
      const trustScore = getListingTrustScore(listing);
      const distance =
        lat !== undefined && lng !== undefined && listing.lat && listing.lng
          ? getDistanceKm({ lat, lng }, { lat: listing.lat, lng: listing.lng })
          : null;
      return { ...listing, trustScore, distanceKm: distance };
    })
    .sort((a: any, b: any) => {
      if (b.trustScore !== a.trustScore) return b.trustScore - a.trustScore;
      if (
        a.distanceKm !== null &&
        b.distanceKm !== null &&
        a.distanceKm !== b.distanceKm
      ) {
        return a.distanceKm - b.distanceKm;
      }
      const aDate = new Date(a.createdAt ?? 0).getTime();
      const bDate = new Date(b.createdAt ?? 0).getTime();
      return bDate - aDate;
    })
    .slice(0, limit);

  const res = NextResponse.json({
    items: filtered,
    ...(debug
      ? {
        debug: {
          baseUrl: getApiBaseUrl(),
          params: Object.fromEntries(params.entries()),
          total: items.length,
        },
      }
      : {}),
  });
  res.headers.set(
    "Cache-Control",
    "public, s-maxage=60, stale-while-revalidate=120",
  );
  return res;
}
