import { NextResponse } from "next/server";
import { getAgentSummary } from "@/app/api/profiles/agents/[id]/_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: { id: string } },
) {
  const summary = await getAgentSummary(context.params.id);
  if (!summary) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(summary);
}
