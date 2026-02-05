import { NextResponse } from "next/server";
import { getApiBaseUrl, parseNumber } from "../_utils";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = parseNumber(url.searchParams.get("lat"));
  const lng = parseNumber(url.searchParams.get("lng"));
  const radiusKm = parseNumber(url.searchParams.get("radiusKm"));

  const params = new URLSearchParams();
  if (lat !== undefined) params.set("lat", lat.toFixed(6));
  if (lng !== undefined) params.set("lng", lng.toFixed(6));
  if (radiusKm !== undefined) params.set("radiusKm", String(radiusKm));

  const response = await fetch(
    `${getApiBaseUrl()}/properties/home/counts?${params.toString()}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    return NextResponse.json(
      {
        verifiedListingsCount: 0,
        partnersCount: 0,
        newListings30dCount: 0,
        trustChecksCount: 0,
      },
      { status: 200 },
    );
  }

  const data = await response.json();
  const res = NextResponse.json(data);
  res.headers.set(
    "Cache-Control",
    "public, s-maxage=120, stale-while-revalidate=300",
  );
  return res;
}
