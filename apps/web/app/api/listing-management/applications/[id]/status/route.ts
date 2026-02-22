import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { serverApiRequest } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));

  try {
    const updated = await serverApiRequest<any>(`/applications/${id}/status`, {
      method: "PATCH",
      body,
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to update application" },
      { status: error?.status || 500 },
    );
  }
}
