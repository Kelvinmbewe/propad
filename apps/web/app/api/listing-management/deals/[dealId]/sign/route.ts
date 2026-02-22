import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { serverApiRequest } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ dealId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { dealId } = await context.params;

  try {
    const updated = await serverApiRequest<any>(`/deals/${dealId}/sign`, {
      method: "POST",
      body,
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to sign deal" },
      { status: error?.status || 500 },
    );
  }
}
