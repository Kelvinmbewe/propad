import { NextResponse } from "next/server";
import {
  DEFAULT_RADIUS_KM,
  clampInt,
  fetchApiJson,
  mapModeParam,
  parseNumber,
  resolveBrowsingLocation,
} from "../_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const type =
      url.searchParams.get("type") === "agencies" ? "agencies" : "agents";
    const mode = mapModeParam(url.searchParams.get("mode"));
    const radiusKm = clampInt(
      parseNumber(url.searchParams.get("radiusKm")),
      DEFAULT_RADIUS_KM,
      1,
      500,
    );
    const limit = clampInt(
      parseNumber(url.searchParams.get("limit")),
      6,
      1,
      12,
    );

    const location = await resolveBrowsingLocation({
      lat: parseNumber(url.searchParams.get("lat")),
      lng: parseNumber(url.searchParams.get("lng")),
      locationId: url.searchParams.get("locationId"),
      locationLevel: url.searchParams.get("locationLevel"),
      q: url.searchParams.get("q"),
      fallbackCity: "Harare",
    });

    const params = new URLSearchParams();
    params.set("lat", location.centerLat.toFixed(6));
    params.set("lng", location.centerLng.toFixed(6));
    params.set("radiusKm", String(Math.min(radiusKm, 150)));
    params.set("limit", String(limit));
    params.set("verifiedOnly", "true");
    if (mode === "SALE") params.set("intent", "FOR_SALE");
    if (mode === "RENT") params.set("intent", "TO_RENT");

    const endpoint =
      type === "agencies"
        ? "/properties/home/top-agencies"
        : "/properties/home/top-agents";
    const items = await fetchApiJson<any[]>(`${endpoint}?${params.toString()}`);

    return NextResponse.json({ items: items ?? [], context: location });
  } catch (error) {
    console.error("[home/partners]", error);
    return NextResponse.json({ items: [] });
  }
}
