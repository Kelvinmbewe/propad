import { NextResponse } from "next/server";
import { fetchApiJson } from "@/app/api/home/_utils";

export const runtime = "nodejs";

type EventType = "SEARCH" | "VIEW_LISTING" | "VIEW_AGENT" | "VIEW_AGENCY";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      type?: EventType;
      listingId?: string;
      locationId?: string;
      agentId?: string;
      agencyId?: string;
      metadata?: Record<string, unknown>;
    };

    const type = body?.type;
    if (!type) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    fetchApiJson(`/properties/home/location-events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        locationId: body.locationId,
        listingId: body.listingId,
        agentId: body.agentId,
        agencyId: body.agencyId,
        metadata: body.metadata,
      }),
    }).catch(() => undefined);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
