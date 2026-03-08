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

  const body = await request.json().catch(() => ({}));

  try {
    const conversation = await serverApiRequest<any>(
      "/messaging/conversations",
      {
        method: "POST",
        body,
      },
    );
    return NextResponse.json(conversation);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to create conversation" },
      { status: error?.status || 500 },
    );
  }
}
