import { NextResponse } from "next/server";
import { serverApiRequest } from "@/lib/server-api";
import { requireMessagingUser } from "../_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authState = await requireMessagingUser();
  if (authState.error) return authState.error;

  try {
    const payload = await request.json();
    const message = await serverApiRequest<any>("/messaging/messages", {
      method: "POST",
      body: payload,
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error("[messages/messages:post]", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 },
    );
  }
}
