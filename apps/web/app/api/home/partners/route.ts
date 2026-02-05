import { NextResponse } from "next/server";
import { getApiBaseUrl, parseNumber } from "../_utils";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = parseNumber(url.searchParams.get("lat"));
  const lng = parseNumber(url.searchParams.get("lng"));
  const radiusKm = parseNumber(url.searchParams.get("radiusKm")) ?? 40;
  const limit = parseNumber(url.searchParams.get("limit")) ?? 6;
  const type = url.searchParams.get("type") ?? "agents";

  const params = new URLSearchParams();
  if (lat !== undefined) params.set("lat", lat.toFixed(6));
  if (lng !== undefined) params.set("lng", lng.toFixed(6));
  params.set("radiusKm", String(radiusKm));
  params.set("limit", String(limit));

  const endpoint = type === "agencies" ? "top-agencies" : "top-agents";
  const response = await fetch(
    `${getApiBaseUrl()}/properties/home/${endpoint}?${params.toString()}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    return NextResponse.json({ items: [] });
  }

  const data = await response.json();
  const res = NextResponse.json({ items: data ?? [] });
  res.headers.set(
    "Cache-Control",
    "public, s-maxage=120, stale-while-revalidate=240",
  );
  return res;
}
