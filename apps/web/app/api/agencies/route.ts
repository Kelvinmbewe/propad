import { NextResponse } from "next/server";
import { serverPublicApiRequest } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);

  if (url.searchParams.get("suggest") === "1") {
    const q = (url.searchParams.get("q") ?? "").trim();
    if (q.length < 2) {
      return NextResponse.json({ items: [] });
    }
    try {
      const items = await serverPublicApiRequest<any[]>(
        `/geo/search?q=${encodeURIComponent(q)}&limit=8`,
      );
      return NextResponse.json({
        items: (items ?? []).map((item) => ({
          id: item.id,
          label: item.name,
          level: item.level,
          cityName: item.cityName,
          provinceName: item.provinceName,
        })),
      });
    } catch {
      return NextResponse.json({ items: [] });
    }
  }

  const query = new URLSearchParams();
  for (const key of [
    "lat",
    "lng",
    "radiusKm",
    "q",
    "province",
    "service",
    "verifiedOnly",
    "minTrust",
    "minRating",
    "sort",
    "take",
    "cursor",
  ]) {
    const value = url.searchParams.get(key);
    if (value != null && value !== "") query.set(key, value);
  }

  try {
    const payload = await serverPublicApiRequest<any>(
      `/companies?${query.toString()}`,
    );
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(
      {
        items: [],
        nextCursor: null,
        popularAreas: [],
        meta: {
          center: { lat: -17.8252, lng: 31.0335 },
          radiusKm: Number(url.searchParams.get("radiusKm") ?? 150),
          totals: {
            agenciesNearYou: 0,
            verifiedAgencies: 0,
            verifiedListings: 0,
            avgTrust: 0,
          },
        },
      },
      { status: 200 },
    );
  }
}
