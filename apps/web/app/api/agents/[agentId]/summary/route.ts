import { NextResponse } from "next/server";
import { getAgentSummary } from "@/app/api/agents/_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: { agentId: string } },
) {
  const summary = await getAgentSummary(context.params.agentId);
  if (!summary) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(summary);
}
