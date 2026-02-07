import { NextResponse } from "next/server";
import {
  MIN_TRUST_SCORE,
  buildBoundsFromCenter,
  getApiBaseUrl,
  getListingTrustScore,
  isPublicListing,
  isVerifiedListing,
  parseNumber,
} from "../../_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = parseNumber(url.searchParams.get("lat"));
  const lng = parseNumber(url.searchParams.get("lng"));
  const radiusKm = parseNumber(url.searchParams.get("radiusKm")) ?? 50;
  const limit = parseNumber(url.searchParams.get("limit")) ?? 12;
  const minTrust =
    parseNumber(url.searchParams.get("minTrust")) ?? MIN_TRUST_SCORE;

  let items: any[] = [];
  try {
    const params = new URLSearchParams();
    if (lat !== undefined) params.set("lat", String(lat));
    if (lng !== undefined) params.set("lng", String(lng));
    params.set("radiusKm", String(radiusKm));

    const response = await fetch(`${getApiBaseUrl()}/properties/featured?${params.toString()}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Featured request failed: ${response.status}`);
    }

    const payload = await response.json();
    items = Array.isArray(payload) ? payload : [];
  } catch (error) {
    console.error("[home/featured]", error);
    return NextResponse.json({ items: [] });
  }
  const bounds =
    lat !== undefined && lng !== undefined
      ? buildBoundsFromCenter(lat, lng, radiusKm)
      : null;

  const filtered = items
    .filter((listing: any) => isPublicListing(listing))
    .filter((listing: any) => isVerifiedListing(listing, minTrust))
    .filter((listing: any) => {
      if (!bounds) return true;
      const latValue = Number(listing.lat ?? 0);
      const lngValue = Number(listing.lng ?? 0);
      return (
        latValue >= bounds.southWest.lat &&
        latValue <= bounds.northEast.lat &&
        lngValue >= bounds.southWest.lng &&
        lngValue <= bounds.northEast.lng
      );
    })
    .map((listing: any) => ({
      ...listing,
      trustScore: getListingTrustScore(listing),
    }))
    .sort((a: any, b: any) => {
      const aPriority = a.featuredListing?.priorityLevel ?? 0;
      const bPriority = b.featuredListing?.priorityLevel ?? 0;
      if (aPriority !== bPriority) return bPriority - aPriority;
      if (b.trustScore !== a.trustScore) return b.trustScore - a.trustScore;
      return (
        new Date(b.createdAt ?? 0).getTime() -
        new Date(a.createdAt ?? 0).getTime()
      );
    })
    .slice(0, limit);

  const res = NextResponse.json({ items: filtered });
  res.headers.set(
    "Cache-Control",
    "public, s-maxage=180, stale-while-revalidate=300",
  );
  return res;
}
