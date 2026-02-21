import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { serverApiRequest } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as {
      conversationId?: string;
      body?: string;
    };

    const conversationId = payload.conversationId?.trim();
    const body = payload.body?.trim();
    if (!conversationId || !body) {
      return NextResponse.json(
        { error: "conversationId and body are required" },
        { status: 400 },
      );
    }

    const created = await serverApiRequest<any>("/messaging/messages", {
      method: "POST",
      body: {
        conversationId,
        body,
      },
    });

    return NextResponse.json(created);
  } catch (error) {
    console.error("[messages/send]", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 },
    );
  }
}
