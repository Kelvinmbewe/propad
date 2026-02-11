import { NextResponse } from "next/server";
import {
  DEFAULT_LIMIT,
  DEFAULT_RADIUS_KM,
  clampInt,
  fetchPropertiesInRadius,
  mapModeParam,
  parseBoolean,
  parseNumber,
  resolveBrowsingLocation,
} from "../../_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const lat = parseNumber(url.searchParams.get("lat"));
    const lng = parseNumber(url.searchParams.get("lng"));
    const radiusKm = clampInt(
      parseNumber(url.searchParams.get("radiusKm")),
      DEFAULT_RADIUS_KM,
      1,
      150,
    );
    const limit = clampInt(
      parseNumber(url.searchParams.get("limit")),
      DEFAULT_LIMIT,
      1,
      24,
    );
    const verifiedOnly =
      parseBoolean(url.searchParams.get("verifiedOnly")) ?? true;
    const mode = mapModeParam(url.searchParams.get("mode"));
    const locationId = url.searchParams.get("locationId");
    const locationLevel = url.searchParams.get("locationLevel");
    const q = url.searchParams.get("q") ?? url.searchParams.get("city");
    const propertyType = url.searchParams.get("propertyType") ?? undefined;
    const priceMin = parseNumber(url.searchParams.get("priceMin"));
    const priceMax = parseNumber(url.searchParams.get("priceMax"));

    const location = await resolveBrowsingLocation({
      lat,
      lng,
      locationId,
      locationLevel,
      q,
      fallbackCity: "Harare",
    });

    const listings = await fetchPropertiesInRadius({
      centerLat: location.centerLat,
      centerLng: location.centerLng,
      radiusKm,
      mode,
      verifiedOnly,
      limit,
      type: propertyType,
      priceMin,
      priceMax,
    });

    const items = listings
      .sort((a, b) => {
        if (b.trustScore !== a.trustScore) return b.trustScore - a.trustScore;
        if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
        return (
          new Date(b.createdAt ?? 0).getTime() -
          new Date(a.createdAt ?? 0).getTime()
        );
      })
      .slice(0, limit);

    return NextResponse.json({ items, context: location });
  } catch (error) {
    console.error("[home/listings/nearby]", error);
    return NextResponse.json({ items: [] });
  }
}
