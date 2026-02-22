import { NextResponse } from "next/server";
import {
  DEFAULT_RADIUS_KM,
  fetchApiJson,
  fetchPropertiesInRadius,
  getListingTrustBreakdown,
  mapModeParam,
  parseNumber,
  resolveBrowsingLocation,
} from "../_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const mode = mapModeParam(url.searchParams.get("mode"));
    const location = await resolveBrowsingLocation({
      lat: parseNumber(url.searchParams.get("lat")),
      lng: parseNumber(url.searchParams.get("lng")),
      locationId: url.searchParams.get("locationId"),
      locationLevel: url.searchParams.get("locationLevel"),
      q: url.searchParams.get("q"),
      fallbackCity: "Harare",
    });

    const [listings, marketListings] = await Promise.all([
      fetchPropertiesInRadius({
        centerLat: location.centerLat,
        centerLng: location.centerLng,
        radiusKm: DEFAULT_RADIUS_KM,
        mode,
        verifiedOnly: true,
        limit: 160,
      }),
      fetchPropertiesInRadius({
        centerLat: location.centerLat,
        centerLng: location.centerLng,
        radiusKm: DEFAULT_RADIUS_KM,
        mode,
        verifiedOnly: false,
        limit: 160,
      }),
    ]);

    const medianAskingPrice = median(
      marketListings
        .map((item) => Number(item.price ?? 0))
        .filter((value) => Number.isFinite(value) && value > 0),
    );

    const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const verifiedListingsCount = listings.length;
    const newListings30dCount = listings.filter(
      (item) => new Date(item.createdAt ?? 0).getTime() >= since,
    ).length;
    const trustChecksCompletedCount = listings.filter((item) => {
      const breakdown = getListingTrustBreakdown(item);
      return (
        breakdown.photos ||
        breakdown.gps ||
        breakdown.docs ||
        breakdown.siteVisit
      );
    }).length;

    const partnerParams = new URLSearchParams();
    partnerParams.set("lat", location.centerLat.toFixed(6));
    partnerParams.set("lng", location.centerLng.toFixed(6));
    partnerParams.set("radiusKm", "150");
    partnerParams.set("limit", "12");
    partnerParams.set("verifiedOnly", "true");
    if (mode === "SALE") partnerParams.set("intent", "FOR_SALE");
    if (mode === "RENT") partnerParams.set("intent", "TO_RENT");

    const [agents, agencies] = await Promise.all([
      fetchApiJson<any[]>(
        `/properties/home/top-agents?${partnerParams.toString()}`,
      ),
      fetchApiJson<any[]>(
        `/properties/home/top-agencies?${partnerParams.toString()}`,
      ),
    ]);

    return NextResponse.json({
      verifiedListingsCount,
      partnersCount: (agents?.length ?? 0) + (agencies?.length ?? 0),
      newListings30dCount,
      trustChecksCompletedCount,
      medianAskingPrice,
      context: location,
    });
  } catch (error) {
    console.error("[home/counts]", error);
    return NextResponse.json({
      verifiedListingsCount: 0,
      partnersCount: 0,
      newListings30dCount: 0,
      trustChecksCompletedCount: 0,
      medianAskingPrice: null,
    });
  }
}
