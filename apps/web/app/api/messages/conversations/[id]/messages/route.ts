import { NextResponse } from "next/server";
import { serverApiRequest } from "@/lib/server-api";
import {
  requireMessagingUser,
  toMessagingApiErrorResponse,
} from "../../../_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authState = await requireMessagingUser();
  if (authState.error) return authState.error;

  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor")?.trim();
    const search = new URLSearchParams();
    if (cursor) search.set("cursor", cursor);
    const endpoint = `/messaging/conversations/${id}/messages${search.size ? `?${search.toString()}` : ""}`;
    const messages = await serverApiRequest<any[]>(endpoint);
    return NextResponse.json(messages);
  } catch (error) {
    console.error("[messages/conversations/:id/messages:get]", error);
    return toMessagingApiErrorResponse(error, "Failed to load messages");
  }
}
