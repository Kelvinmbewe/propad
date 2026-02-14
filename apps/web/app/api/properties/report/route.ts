import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      propertyId?: string;
      reason?: string;
      details?: string;
    };

    if (!body.propertyId || !body.reason) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    console.warn("[property-report]", {
      propertyId: body.propertyId,
      userId: session.user.id,
      reason: body.reason,
      details: body.details ?? null,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
