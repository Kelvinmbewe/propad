import { NextResponse } from "next/server";
import {
  DEFAULT_LIMIT,
  DEFAULT_RADIUS_KM,
  FEATURED_MAX_RADIUS_KM,
  FEATURED_MIN_RESULTS,
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
    const mode = mapModeParam(url.searchParams.get("mode"));
    const verifiedOnly =
      parseBoolean(url.searchParams.get("verifiedOnly")) ?? true;
    const locationId = url.searchParams.get("locationId");
    const locationLevel = url.searchParams.get("locationLevel");
    const q = url.searchParams.get("q") ?? url.searchParams.get("city");
    const primaryRadiusKm = clampInt(
      parseNumber(url.searchParams.get("primaryRadiusKm")),
      DEFAULT_RADIUS_KM,
      1,
      500,
    );
    const maxRadiusKm = clampInt(
      parseNumber(url.searchParams.get("maxRadiusKm")),
      FEATURED_MAX_RADIUS_KM,
      primaryRadiusKm,
      500,
    );
    const minResults = clampInt(
      parseNumber(url.searchParams.get("minResults")),
      FEATURED_MIN_RESULTS,
      1,
      24,
    );
    const limit = clampInt(
      parseNumber(url.searchParams.get("limit")),
      DEFAULT_LIMIT,
      1,
      24,
    );

    const location = await resolveBrowsingLocation({
      lat,
      lng,
      locationId,
      locationLevel,
      q,
      fallbackCity: "Harare",
    });

    const candidates = await fetchPropertiesInRadius({
      centerLat: location.centerLat,
      centerLng: location.centerLng,
      radiusKm: maxRadiusKm,
      mode,
      verifiedOnly,
      limit: limit * 8,
      locationId: location.locationId,
      locationLevel: location.locationLevel,
    });

    const featured = candidates.filter(
      (listing) =>
        listing?.isFeatured ||
        listing?.featuredListing?.status === "ACTIVE" ||
        typeof listing?.featuredListing?.priorityLevel === "number",
    );

    const score = (listing: any) =>
      Number(listing?.featuredListing?.priorityLevel ?? 0);

    const primary = featured
      .filter((listing) => listing.distanceKm <= primaryRadiusKm)
      .sort((a, b) => {
        if (score(b) !== score(a)) return score(b) - score(a);
        if (b.trustScore !== a.trustScore) return b.trustScore - a.trustScore;
        return (
          new Date(b.createdAt ?? 0).getTime() -
          new Date(a.createdAt ?? 0).getTime()
        );
      });

    const selectedPrimary = primary.slice(0, limit);
    const selectedIds = new Set(selectedPrimary.map((item) => item.id));
    const needExpanded = selectedPrimary.length < minResults;

    const expanded = needExpanded
      ? featured
        .filter(
          (listing) =>
            listing.distanceKm > primaryRadiusKm &&
            listing.distanceKm <= maxRadiusKm &&
            !selectedIds.has(listing.id),
        )
        .sort((a, b) => {
          if (score(b) !== score(a)) return score(b) - score(a);
          if (b.trustScore !== a.trustScore)
            return b.trustScore - a.trustScore;
          return (
            new Date(b.createdAt ?? 0).getTime() -
            new Date(a.createdAt ?? 0).getTime()
          );
        })
      : [];

    const items = [...selectedPrimary, ...expanded].slice(0, limit);

    return NextResponse.json({
      items,
      context: location,
      meta: {
        usedPrimaryRadius: true,
        expanded: needExpanded && expanded.length > 0,
        primaryCount: selectedPrimary.length,
        expandedCount: Math.max(0, items.length - selectedPrimary.length),
      },
    });
  } catch (error) {
    console.error("[home/listings/featured]", error);
    return NextResponse.json({
      items: [],
      meta: {
        usedPrimaryRadius: true,
        expanded: false,
        primaryCount: 0,
        expandedCount: 0,
      },
    });
  }
}
