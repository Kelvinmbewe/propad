import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { serverApiRequest, serverPublicApiRequest } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth();
  const requesterId = session?.user?.id;

  if (!requesterId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const requestUrl = new URL(request.url);
    const rawBody = await request.text();
    const payload = (rawBody ? JSON.parse(rawBody) : {}) as {
      agentUserId?: string;
      companyId?: string;
    };

    const queryCompanyId =
      requestUrl.searchParams.get("companyId") ?? undefined;

    let recipientUserId = payload.agentUserId?.trim();
    const companyId = payload.companyId?.trim() || queryCompanyId?.trim();
    if (!recipientUserId && companyId) {
      const company = await serverPublicApiRequest<any>(
        `/companies/${companyId}`,
      );
      recipientUserId = company?.team?.find(
        (member: any) => member?.id && member.id !== requesterId,
      )?.id;
      if (!recipientUserId) {
        return NextResponse.json(
          { error: "No available agency inbox recipient" },
          { status: 404 },
        );
      }
    }

    if (!recipientUserId) {
      return NextResponse.json(
        { error: "agentUserId or companyId is required" },
        { status: 400 },
      );
    }

    if (recipientUserId === requesterId) {
      return NextResponse.json(
        { error: "Cannot message yourself" },
        { status: 400 },
      );
    }

    const conversations = await serverApiRequest<any[]>(
      "/messaging/conversations",
    );
    const existing = (conversations ?? []).find((conversation: any) => {
      const participants = conversation.participants ?? [];
      const ids = participants.map(
        (participant: any) => participant.user?.id ?? participant.userId,
      );
      const hasRequester = ids.includes(requesterId);
      const hasAgent = ids.includes(recipientUserId);
      return (
        hasRequester &&
        hasAgent &&
        !conversation.propertyId &&
        !conversation.dealId &&
        !conversation.applicationId
      );
    });

    if (existing?.id) {
      return NextResponse.json({ threadId: existing.id, reused: true });
    }

    const created = await serverApiRequest<any>("/messaging/conversations", {
      method: "POST",
      body: {
        propertyId: null,
        participantIds: [recipientUserId],
      },
    });

    return NextResponse.json({ threadId: created.id, reused: false });
  } catch (error) {
    console.error("[messages/start]", error);
    return NextResponse.json(
      { error: "Failed to start chat" },
      { status: 500 },
    );
  }
}
