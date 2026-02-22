import { NextResponse } from "next/server";
import { serverApiRequest } from "@/lib/server-api";
import { requireMessagingUser } from "../../../_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authState = await requireMessagingUser();
  if (authState.error) return authState.error;

  try {
    const { id } = await context.params;
    const result = await serverApiRequest(
      `/messaging/conversations/${id}/read`,
      {
        method: "POST",
      },
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error("[messages/conversations/:id/read:post]", error);
    return NextResponse.json(
      { error: "Failed to mark conversation read" },
      { status: 500 },
    );
  }
}
