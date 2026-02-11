import { NextResponse } from "next/server";
import {
  DEFAULT_RADIUS_KM,
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
    const mode = mapModeParam(url.searchParams.get("mode"));
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
    params.set("radiusKm", String(DEFAULT_RADIUS_KM));
    params.set("limitCities", "6");
    params.set("limitSuburbs", "6");
    if (mode === "SALE") params.set("intent", "FOR_SALE");
    if (mode === "RENT") params.set("intent", "TO_RENT");

    const payload = await fetchApiJson<{
      cities?: any[];
      suburbs?: any[];
    }>(`/properties/home/areas?${params.toString()}`);

    return NextResponse.json({
      topCities: payload.cities ?? [],
      topSuburbs: payload.suburbs ?? [],
      context: location,
    });
  } catch (error) {
    console.error("[home/areas]", error);
    return NextResponse.json({ topCities: [], topSuburbs: [] });
  }
}
