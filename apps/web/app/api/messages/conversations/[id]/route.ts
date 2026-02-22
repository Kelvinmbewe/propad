import { NextResponse } from "next/server";
import { serverApiRequest } from "@/lib/server-api";
import { requireMessagingUser } from "../../_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authState = await requireMessagingUser();
  if (authState.error) return authState.error;

  try {
    const { id } = await context.params;
    const conversation = await serverApiRequest<any>(
      `/messaging/conversations/${id}`,
    );
    return NextResponse.json(conversation);
  } catch (error) {
    console.error("[messages/conversations/:id:get]", error);
    return NextResponse.json(
      { error: "Failed to load conversation" },
      { status: 500 },
    );
  }
}
