import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { serverApiRequest } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const propertyId = url.searchParams.get("propertyId")?.trim();
  if (!propertyId) {
    return NextResponse.json(
      { error: "propertyId is required" },
      { status: 400 },
    );
  }

  try {
    const conversations = await serverApiRequest<any[]>(
      "/messaging/conversations",
    );
    const listingChats = (conversations ?? []).filter(
      (conversation: any) => conversation?.propertyId === propertyId,
    );
    return NextResponse.json({ items: listingChats });
  } catch (error) {
    console.error("[messages/listing]", error);
    return NextResponse.json({ items: [] });
  }
}
