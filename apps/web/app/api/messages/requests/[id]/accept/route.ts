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
    const request = await serverApiRequest<any>(
      `/messaging/requests/${id}/accept`,
      {
        method: "POST",
      },
    );

    return NextResponse.json(request);
  } catch (error) {
    console.error("[messages/requests/:id/accept:post]", error);
    return NextResponse.json(
      { error: "Failed to accept request" },
      { status: 500 },
    );
  }
}
