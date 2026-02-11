import { NextResponse } from "next/server";
import { fetchApiJson } from "@/app/api/home/_utils";

type GeoSearchResult = {
  id: string;
  name: string;
  level: "COUNTRY" | "PROVINCE" | "CITY" | "SUBURB";
  parentId?: string;
  provinceId?: string;
  provinceName?: string;
  cityName?: string;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

async function enrichLocation(item: GeoSearchResult) {
  if (item.level === "CITY") {
    const provinceId = item.provinceId ?? item.parentId;
    if (!provinceId) return null;
    const cities = await fetchApiJson<
      Array<{
        id: string;
        name: string;
        lat?: number | null;
        lng?: number | null;
        province?: { name?: string | null } | null;
      }>
    >(`/geo/cities?provinceId=${encodeURIComponent(provinceId)}`);
    const city = cities.find((entry) => entry.id === item.id);
    if (!city) return null;
    return {
      id: city.id,
      name: city.name,
      type: item.level,
      level: item.level,
      lat: city.lat ?? null,
      lng: city.lng ?? null,
      province: city.province?.name ?? item.provinceName ?? null,
    };
  }

  if (item.level === "SUBURB") {
    if (!item.parentId) return null;
    const suburbs = await fetchApiJson<
      Array<{
        id: string;
        name: string;
        lat?: number | null;
        lng?: number | null;
        city?: { name?: string | null } | null;
        province?: { name?: string | null } | null;
      }>
    >(`/geo/suburbs?cityId=${encodeURIComponent(item.parentId)}`);
    const suburb = suburbs.find((entry) => entry.id === item.id);
    if (!suburb) return null;
    return {
      id: suburb.id,
      name: suburb.name,
      type: item.level,
      level: item.level,
      lat: suburb.lat ?? null,
      lng: suburb.lng ?? null,
      province: suburb.province?.name ?? item.provinceName ?? null,
      city: suburb.city?.name ?? item.cityName ?? null,
    };
  }

  return null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const limit = Math.min(
    10,
    Math.max(1, Number(url.searchParams.get("limit") ?? "10")),
  );

  if (!query.trim()) {
    return NextResponse.json({ items: [] });
  }

  try {
    const results = await fetchApiJson<GeoSearchResult[]>(
      `/geo/search?q=${encodeURIComponent(query)}&limit=${limit}`,
    );

    const shortlist = results
      .filter((item) => item.level === "CITY" || item.level === "SUBURB")
      .slice(0, limit);

    const enriched = (
      await Promise.all(shortlist.map((item) => enrichLocation(item)))
    ).filter(Boolean);

    return NextResponse.json({ items: enriched });
  } catch (error) {
    console.error("[locations/search]", error);
    return NextResponse.json({ items: [] });
  }
}
