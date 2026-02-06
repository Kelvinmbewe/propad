import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/app/api/home/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const limit = url.searchParams.get("limit") ?? "12";

  if (!query.trim()) {
    return NextResponse.json({ items: [] });
  }

  try {
    const response = await fetch(
      `${getApiBaseUrl()}/geo/search?q=${encodeURIComponent(query)}&limit=${encodeURIComponent(limit)}`,
      { cache: "no-store" },
    );

    if (!response.ok) {
      throw new Error(`Location search failed: ${response.status}`);
    }

    const items = await response.json();
    const res = NextResponse.json({ items });
    res.headers.set(
      "Cache-Control",
      "public, s-maxage=30, stale-while-revalidate=60",
    );
    return res;
  } catch (error) {
    console.error("[locations/search]", error);
    return NextResponse.json({ items: [] });
  }
}
