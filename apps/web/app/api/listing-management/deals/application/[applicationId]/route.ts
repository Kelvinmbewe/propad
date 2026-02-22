import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { serverApiRequest } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ applicationId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { applicationId } = await context.params;
  try {
    const deal = await serverApiRequest<any>(
      `/deals/application/${applicationId}`,
    );
    return NextResponse.json(deal);
  } catch {
    return NextResponse.json(null);
  }
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ applicationId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { applicationId } = await context.params;
  try {
    const deal = await serverApiRequest<any>(
      `/deals/application/${applicationId}/create`,
      { method: "POST" },
    );
    return NextResponse.json(deal);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to create deal" },
      { status: error?.status || 500 },
    );
  }
}
