import { NextResponse } from "next/server";
import {
  getAgentSummary,
  getNearbyPartners,
} from "@/app/api/profiles/agents/[id]/_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: { id: string } },
) {
  const summary = await getAgentSummary(context.params.id);
  if (!summary) {
    return NextResponse.json({ agents: [], agencies: [] });
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") ?? "sale";

  const nearby = await getNearbyPartners({
    q: summary.location ?? undefined,
    mode,
    limit: 5,
  });

  return NextResponse.json({
    agents: (nearby.agents ?? []).filter((item: any) => item.id !== summary.id),
    agencies: nearby.agencies ?? [],
  });
}
