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
  const search = new URLSearchParams();
  const type = url.searchParams.get("type");
  const status = url.searchParams.get("status");
  const q = url.searchParams.get("q");
  if (type) search.set("type", type);
  if (status) search.set("status", status);
  if (q) search.set("q", q);

  try {
    const items = await serverApiRequest<any[]>(
      `/messaging/conversations${search.size ? `?${search.toString()}` : ""}`,
    );
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load conversations" },
      { status: error?.status || 500 },
    );
  }
}
