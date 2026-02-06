import { NextResponse } from "next/server";
import { getApiBaseUrl, parseNumber } from "../_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = parseNumber(url.searchParams.get("lat"));
  const lng = parseNumber(url.searchParams.get("lng"));
  const radiusKm = parseNumber(url.searchParams.get("radiusKm")) ?? 40;
  const city = url.searchParams.get("city");

  const params = new URLSearchParams();
  if (lat !== undefined) params.set("lat", lat.toFixed(6));
  if (lng !== undefined) params.set("lng", lng.toFixed(6));
  if (radiusKm) params.set("radiusKm", String(radiusKm));
  if (city) params.set("city", city);

  try {
    const response = await fetch(
      `${getApiBaseUrl()}/properties/home/areas?${params.toString()}`,
      { cache: "no-store" },
    );

    if (!response.ok) {
      throw new Error(`Areas request failed: ${response.status}`);
    }

    const data = await response.json();
    const res = NextResponse.json(data);
    res.headers.set(
      "Cache-Control",
      "public, s-maxage=180, stale-while-revalidate=300",
    );
    return res;
  } catch (error) {
    console.error("[home/areas]", error);
    return NextResponse.json({ cities: [], suburbs: [] });
  }
}
