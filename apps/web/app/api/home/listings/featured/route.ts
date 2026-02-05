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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = parseNumber(url.searchParams.get("lat"));
  const lng = parseNumber(url.searchParams.get("lng"));
  const radiusKm = parseNumber(url.searchParams.get("radiusKm")) ?? 50;
  const limit = parseNumber(url.searchParams.get("limit")) ?? 12;
  const minTrust =
    parseNumber(url.searchParams.get("minTrust")) ?? MIN_TRUST_SCORE;

  const response = await fetch(`${getApiBaseUrl()}/properties/featured`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json({ items: [] });
  }

  const payload = await response.json();
  const items = Array.isArray(payload) ? payload : [];
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
