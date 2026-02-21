import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: { id: string } },
) {
  const url = new URL(request.url);
  return NextResponse.json(
    {
      error: "Deprecated endpoint",
      message: "Use /api/agents/:agentId/performance instead.",
      replacement: `/api/agents/${context.params.id}/performance${url.search}`,
    },
    { status: 410 },
  );
}
