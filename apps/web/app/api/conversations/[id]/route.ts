import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { serverApiRequest } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    const conversation = await serverApiRequest<any>(
      `/messaging/conversations/${id}`,
    );
    return NextResponse.json(conversation);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load conversation" },
      { status: error?.status || 500 },
    );
  }
}
