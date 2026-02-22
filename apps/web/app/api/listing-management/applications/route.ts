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
    const [applications, interests, conversations, viewings] =
      await Promise.all([
        serverApiRequest<any[]>(`/applications/property/${propertyId}`),
        serverApiRequest<any[]>(`/properties/${propertyId}/interests`),
        serverApiRequest<any[]>("/messaging/conversations?type=listing"),
        serverApiRequest<any[]>(`/properties/${propertyId}/viewings`),
      ]);

    const listingConversations = (conversations ?? []).filter(
      (conversation) =>
        conversation?.propertyId === propertyId ||
        conversation?.listingId === propertyId ||
        conversation?.property?.id === propertyId,
    );

    const lastMessageByUser = new Map<
      string,
      { body: string; at: string | null }
    >();
    for (const conversation of listingConversations) {
      const last = conversation?.messages?.[0];
      const participants = (conversation?.participants ?? []) as Array<any>;
      const other = participants.find(
        (participant) =>
          participant?.userId && participant.userId !== session.user.id,
      );
      if (!other?.userId) continue;

      const previous = lastMessageByUser.get(other.userId);
      const previousAt = previous?.at ? new Date(previous.at).getTime() : 0;
      const nextAt = last?.createdAt ? new Date(last.createdAt).getTime() : 0;
      if (nextAt >= previousAt) {
        lastMessageByUser.set(other.userId, {
          body: last?.body ?? "",
          at: last?.createdAt ?? null,
        });
      }
    }

    const nextViewingByUser = new Map<string, string>();
    for (const viewing of viewings ?? []) {
      const viewerId = viewing?.viewerId;
      const scheduledAt = viewing?.scheduledAt;
      if (!viewerId || !scheduledAt) continue;
      const current = nextViewingByUser.get(viewerId);
      if (!current || new Date(scheduledAt) < new Date(current)) {
        nextViewingByUser.set(viewerId, scheduledAt);
      }
    }

    const applicationRows = (applications ?? []).map((application) => ({
      id: application.id,
      source: "APPLICATION",
      status:
        application.status === "SUBMITTED"
          ? "PENDING"
          : application.status === "UNDER_REVIEW"
            ? "NEEDS_INFO"
            : application.status,
      decisionReason: application.notes ?? null,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      type:
        application.property?.listingIntent === "FOR_SALE"
          ? "BUY_APPLICATION"
          : "RENT_APPLICATION",
      user: {
        id: application.user?.id,
        name: application.user?.name ?? null,
        email: application.user?.email ?? null,
        profilePhoto: application.user?.profilePhoto ?? null,
        trustScore: application.user?.trustScore ?? null,
        verificationScore: application.user?.verificationScore ?? null,
        isVerified: application.user?.isVerified ?? null,
      },
      timeline: {
        appliedAt: application.createdAt,
        lastMessage: application.user?.id
          ? lastMessageByUser.get(application.user.id)?.body ?? null
          : null,
        nextViewingAt: application.user?.id
          ? nextViewingByUser.get(application.user.id) ?? null
          : null,
      },
    }));

    const legacyRows = (interests ?? []).map((interest) => ({
      id: interest.id,
      source: "INTEREST",
      status: interest.status,
      decisionReason: interest.message ?? null,
      createdAt: interest.createdAt,
      updatedAt: interest.updatedAt,
      type: "INTEREST",
      offerAmount: interest.offerAmount ?? null,
      user: {
        id: interest.user?.id,
        name: interest.user?.name ?? null,
        email: interest.user?.email ?? null,
        profilePhoto: interest.user?.profilePhoto ?? null,
        trustScore: interest.user?.trustScore ?? null,
        verificationScore: interest.user?.verificationScore ?? null,
        isVerified: interest.user?.isVerified ?? null,
      },
      timeline: {
        appliedAt: interest.createdAt,
        lastMessage: interest.user?.id
          ? lastMessageByUser.get(interest.user.id)?.body ?? null
          : null,
        nextViewingAt: interest.user?.id
          ? nextViewingByUser.get(interest.user.id) ?? null
          : null,
      },
    }));

    const rows = [...applicationRows, ...legacyRows].sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime(),
    );

    return NextResponse.json({ items: rows });
  } catch (error) {
    console.error("[listing-management/applications:get]", error);
    return NextResponse.json({ items: [] });
  }
}
