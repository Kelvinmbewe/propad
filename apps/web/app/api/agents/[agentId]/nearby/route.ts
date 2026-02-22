import { NextResponse } from "next/server";
import { getAgentSummary, getNearbyPartners } from "@/app/api/agents/_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: { agentId: string } },
) {
  const summary = await getAgentSummary(context.params.agentId);
  if (!summary) {
    return NextResponse.json({ agents: [], agencies: [] });
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") ?? "sale";
  const gpsLat =
    typeof summary?.lat === "number"
      ? summary.lat
      : typeof summary?.locationResolved?.lat === "number"
        ? summary.locationResolved.lat
        : undefined;
  const gpsLng =
    typeof summary?.lng === "number"
      ? summary.lng
      : typeof summary?.locationResolved?.lng === "number"
        ? summary.locationResolved.lng
        : undefined;

  const nearby = await getNearbyPartners({
    lat: gpsLat,
    lng: gpsLng,
    q: summary.location ?? undefined,
    mode,
    limit: 8,
  });

  return NextResponse.json({
    agents: (nearby.agents ?? []).filter((item: any) => item.id !== summary.id),
    agencies: nearby.agencies ?? [],
  });
}
