import { NextResponse } from "next/server";
import { serverPublicApiRequest } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const agencyId = url.searchParams.get("agencyId")?.trim();

  if (agencyId) {
    try {
      const company = await serverPublicApiRequest<any>(
        `/companies/${agencyId}`,
      );
      return NextResponse.json({
        items: (company?.team ?? []).slice(0, 6),
      });
    } catch {
      return NextResponse.json({ items: [] });
    }
  }

  const lat = Number(url.searchParams.get("lat") ?? -17.8252);
  const lng = Number(url.searchParams.get("lng") ?? 31.0335);
  const radiusKm = Number(url.searchParams.get("radiusKm") ?? 150);
  const limit = Number(url.searchParams.get("limit") ?? 8);

  try {
    const items = await serverPublicApiRequest<any[]>(
      `/properties/home/top-agents?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}&limit=${limit}&verifiedOnly=true`,
    );
    return NextResponse.json({ items: items ?? [] });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
