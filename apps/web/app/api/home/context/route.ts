import { NextResponse } from "next/server";
import { parseNumber, resolveBrowsingLocation } from "../_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const location = await resolveBrowsingLocation({
      lat: parseNumber(url.searchParams.get("lat")),
      lng: parseNumber(url.searchParams.get("lng")),
      locationId: url.searchParams.get("locationId"),
      locationLevel: url.searchParams.get("locationLevel"),
      q: url.searchParams.get("q"),
      fallbackCity: "Harare",
    });

    return NextResponse.json(location);
  } catch (error) {
    console.error("[home/context]", error);
    return NextResponse.json(
      {
        centerLat: -17.8252,
        centerLng: 31.0335,
        city: "Harare",
        province: "Harare",
        country: "Zimbabwe",
        locationId: null,
        source: "FALLBACK",
      },
      { status: 200 },
    );
  }
}
