import { NextResponse } from "next/server";
import { serverApiRequest } from "@/lib/server-api";
import { requireMessagingUser, toMessagingApiErrorResponse } from "../_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authState = await requireMessagingUser();
  if (authState.error) return authState.error;

  const url = new URL(request.url);
  const type = url.searchParams.get("type")?.trim();
  const status = url.searchParams.get("status")?.trim();
  const q = url.searchParams.get("q")?.trim();

  const search = new URLSearchParams();
  if (type) search.set("type", type);
  if (status) search.set("status", status);
  if (q) search.set("q", q);

  try {
    const endpoint = `/messaging/conversations${search.size ? `?${search.toString()}` : ""}`;
    const conversations = await serverApiRequest<any[]>(endpoint);
    return NextResponse.json(conversations);
  } catch (error) {
    console.error("[messages/conversations:get]", error);
    return toMessagingApiErrorResponse(error, "Failed to load conversations");
  }
}

export async function POST(request: Request) {
  const authState = await requireMessagingUser();
  if (authState.error) return authState.error;

  try {
    const payload = await request.json();
    const conversation = await serverApiRequest<any>(
      "/messaging/conversations",
      {
        method: "POST",
        body: payload,
      },
    );

    return NextResponse.json(conversation);
  } catch (error) {
    console.error("[messages/conversations:post]", error);
    return toMessagingApiErrorResponse(error, "Failed to create conversation");
  }
}
