import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { serverApiRequest } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ dealId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { dealId } = await context.params;
  try {
    const deal = await serverApiRequest<any>(`/deals/${dealId}`);
    return NextResponse.json(deal);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load deal" },
      { status: error?.status || 500 },
    );
  }
}
