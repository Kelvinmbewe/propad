import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { serverApiRequest } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor")?.trim();
  const search = new URLSearchParams();
  if (cursor) search.set("cursor", cursor);

  try {
    const messages = await serverApiRequest<any[]>(
      `/messaging/conversations/${id}/messages${search.size ? `?${search.toString()}` : ""}`,
    );
    return NextResponse.json(messages);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load messages" },
      { status: error?.status || 500 },
    );
  }
}

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
    const message = await serverApiRequest<any>("/messaging/messages", {
      method: "POST",
      body: { conversationId: id, ...body },
    });
    return NextResponse.json(message);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to send message" },
      { status: error?.status || 500 },
    );
  }
}
