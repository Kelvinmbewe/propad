"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Textarea,
  notify,
} from "@propad/ui";
import { ApplicationModal } from "@/components/application-modal";
import { AdSlot } from "@/components/ad-slot";
import { getRequiredPublicApiBaseUrl } from "@/lib/api-base-url";
import { useAuthenticatedSDK } from "@/hooks/use-authenticated-sdk";
import { useMessagingEntry } from "@/features/messaging/use-messaging-entry";
import { SlotCalendar } from "@/components/viewings/slot-calendar";

interface SidebarEntity {
  name: string;
  roleLabel: string;
  phone?: string | null;
  profileHref?: string | null;
}

export function ListingSidebar({
  propertyId,
  propertyTitle,
  landlordId,
  agentOwnerId,
  entity,
}: {
  propertyId: string;
  propertyTitle: string;
  landlordId?: string | null;
  agentOwnerId?: string | null;
  entity: SidebarEntity;
}) {
  const { data: session } = useSession();
  const sdk = useAuthenticatedSDK();
  const [viewingOpen, setViewingOpen] = useState(false);
  const [viewingDate, setViewingDate] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<
    Array<{
      id: string;
      startAt: string;
      endAt: string;
      status: "OPEN" | "BOOKED" | "CANCELLED";
    }>
  >([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [viewingNotes, setViewingNotes] = useState("");
  const [viewingLoading, setViewingLoading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("Suspicious information");
  const [reportDetails, setReportDetails] = useState("");
  const [reportLoading, setReportLoading] = useState(false);

  const accessToken = (session as { accessToken?: string } | null)?.accessToken;
  const isAuthed = Boolean(session?.user?.id);
  const { openMessageDrawer } = useMessagingEntry();
  const isOwner =
    Boolean(session?.user?.id) &&
    (session?.user?.id === landlordId || session?.user?.id === agentOwnerId);

  const callHref = useMemo(() => {
    if (!entity.phone) return null;
    return `tel:${entity.phone.replace(/\s+/g, "")}`;
  }, [entity.phone]);

  const ensureSignIn = () => {
    signIn(undefined, {
      callbackUrl:
        typeof window !== "undefined"
          ? window.location.href
          : `/properties/${propertyId}`,
    });
  };

  const scheduleViewing = async () => {
    if (!isAuthed || !accessToken) {
      ensureSignIn();
      return;
    }
    if (!selectedSlotId && !viewingDate) {
      notify.error("Choose an available slot or request a custom time.");
      return;
    }
    setViewingLoading(true);
    try {
      const response = await fetch(
        `${getRequiredPublicApiBaseUrl()}/properties/${propertyId}/viewings/schedule`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            slotId: selectedSlotId || undefined,
            scheduledAt: selectedSlotId
              ? undefined
              : new Date(viewingDate).toISOString(),
            notes: viewingNotes || undefined,
          }),
        },
      );
      if (!response.ok) {
        const raw = await response.text();
        let parsed: any = null;
        try {
          parsed = raw ? JSON.parse(raw) : null;
        } catch {
          parsed = null;
        }
        throw new Error(
          parsed?.message ||
            parsed?.error ||
            "Could not send viewing request now.",
        );
      }
      notify.success("Viewing request sent.");
      setViewingOpen(false);
      setViewingNotes("");
      setSelectedSlotId(null);
    } catch (error) {
      notify.error(
        error instanceof Error && error.message
          ? error.message
          : "Could not send viewing request now.",
      );
    } finally {
      setViewingLoading(false);
    }
  };

  const loadViewingSlots = async () => {
    setLoadingSlots(true);
    try {
      const response = await fetch(
        `${getRequiredPublicApiBaseUrl()}/properties/${propertyId}/viewing-slots`,
        {
          headers: accessToken
            ? {
                Authorization: `Bearer ${accessToken}`,
              }
            : undefined,
        },
      );
      if (!response.ok) throw new Error("failed");
      const payload = await response.json();
      setAvailableSlots(Array.isArray(payload) ? payload : []);
    } catch {
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleToggleInterest = async () => {
    if (!isAuthed || !sdk) {
      ensureSignIn();
      return;
    }
    try {
      const result = await sdk.interests.toggle(propertyId);
      notify.success(
        result.isSaved ? "Property saved" : "Property removed from saved",
      );
    } catch {
      notify.error("Could not update saved property right now.");
    }
  };

  const shareUrl =
    typeof window !== "undefined"
      ? window.location.href
      : `https://propad.co.zw/properties/${propertyId}`;

  const handleCopyLink = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    await navigator.clipboard.writeText(shareUrl);
    notify.success("Link copied");
  };

  const handleNativeShare = async () => {
    if (typeof navigator === "undefined" || !("share" in navigator)) {
      setShareOpen(true);
      return;
    }
    try {
      await navigator.share({
        title: propertyTitle,
        url: shareUrl,
      });
    } catch {
      // ignore user cancellation
    }
  };

  const handleReport = async () => {
    if (!isAuthed) {
      ensureSignIn();
      return;
    }
    setReportLoading(true);
    try {
      const response = await fetch("/api/properties/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          reason: reportReason,
          details: reportDetails,
        }),
      });
      if (!response.ok) {
        throw new Error("failed");
      }
      notify.success("Report submitted. Thank you.");
      setReportOpen(false);
      setReportDetails("");
    } catch {
      notify.error("We could not submit your report right now.");
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <aside className="space-y-4 lg:sticky lg:top-24">
      <section className="rounded-2xl border border-border bg-card p-4 text-card-foreground">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Get started
        </h3>
        {isOwner ? (
          <div className="mt-3 space-y-2">
            <p className="text-sm text-muted-foreground">
              You are managing this listing.
            </p>
            <Button
              asChild
              className="w-full bg-emerald-600 text-white hover:bg-emerald-500"
            >
              <Link href={`/dashboard/listings/${propertyId}`}>
                Manage listing
              </Link>
            </Button>
          </div>
        ) : null}
        {!isOwner && isAuthed ? (
          <div className="mt-3 space-y-2">
            <ApplicationModal
              propertyId={propertyId}
              propertyTitle={propertyTitle}
            />
            <Button
              variant="secondary"
              className="w-full"
              onClick={() =>
                openMessageDrawer({
                  listingId: propertyId,
                  recipientId: agentOwnerId ?? landlordId ?? undefined,
                })
              }
            >
              Message
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                setViewingDate("");
                setSelectedSlotId(null);
                void loadViewingSlots();
                setViewingOpen(true);
              }}
            >
              Request viewing
            </Button>
          </div>
        ) : !isOwner ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-muted-foreground">
              Sign in to apply, chat with the manager, and request viewings
              instantly.
            </p>
            <Button
              className="w-full bg-emerald-600 text-white hover:bg-emerald-500"
              onClick={() =>
                signIn(undefined, {
                  callbackUrl:
                    typeof window !== "undefined"
                      ? window.location.href
                      : `/properties/${propertyId}`,
                })
              }
            >
              Sign in to apply/chat
            </Button>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 text-card-foreground">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Managed by
        </h3>
        <p className="mt-2 text-base font-semibold text-foreground">
          {entity.name}
        </p>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {entity.roleLabel}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {callHref ? (
            <Button asChild variant="secondary" size="sm">
              <a href={callHref}>Call</a>
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              if (!isAuthed) {
                ensureSignIn();
                return;
              }
              openMessageDrawer({
                listingId: propertyId,
                recipientId: agentOwnerId ?? landlordId ?? undefined,
              });
            }}
          >
            Message
          </Button>
          {entity.profileHref ? (
            <Button asChild size="sm" variant="secondary">
              <Link href={entity.profileHref}>View profile</Link>
            </Button>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 text-card-foreground">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Quick actions
        </h3>
        <div className="mt-3 grid gap-2">
          <Button variant="secondary" onClick={handleToggleInterest}>
            Save property
          </Button>
          <Button variant="secondary" onClick={() => setShareOpen(true)}>
            Share property
          </Button>
          <Button variant="secondary" onClick={() => setReportOpen(true)}>
            Report listing
          </Button>
        </div>
      </section>
      <section className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Sponsored
        </p>
        <AdSlot
          source="property-sidebar"
          adsenseEnabled={Boolean(process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID)}
          unitId={process.env.NEXT_PUBLIC_ADSENSE_FEED_SLOT}
          fallbackInhouseAds={[
            {
              id: "property-sidebar-cta",
              title: "Promote your property to verified buyers",
              body: "Feature your listing and earn premium placement in search.",
              ctaLabel: "Boost listing",
              href: "/dashboard/listings",
              tone: "emerald",
            },
          ]}
        />
      </section>

      <Dialog open={viewingOpen} onOpenChange={setViewingOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Request viewing</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                Available slots
              </p>
              {loadingSlots ? (
                <p className="text-sm text-muted-foreground">
                  Loading slots...
                </p>
              ) : !availableSlots.length ? (
                <p className="text-sm text-muted-foreground">
                  No published slots yet. Request a custom time below.
                </p>
              ) : (
                <SlotCalendar
                  slots={availableSlots}
                  selectedSlotId={selectedSlotId}
                  onSelectSlot={(slotId) => {
                    setSelectedSlotId(slotId);
                    setViewingDate("");
                  }}
                />
              )}
            </div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Or request a custom slot
            </p>
            <Input
              type="datetime-local"
              value={viewingDate}
              onChange={(event) => {
                setViewingDate(event.target.value);
                setSelectedSlotId(null);
              }}
            />
            <Textarea
              rows={3}
              value={viewingNotes}
              onChange={(event) => setViewingNotes(event.target.value)}
              placeholder="Preferred time or special notes"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setViewingOpen(false)}
                disabled={viewingLoading}
              >
                Cancel
              </Button>
              <Button onClick={scheduleViewing} disabled={viewingLoading}>
                {viewingLoading ? "Sending..." : "Send request"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Share property</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Button variant="secondary" onClick={handleNativeShare}>
              Share via device
            </Button>
            <Button asChild variant="secondary">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`${propertyTitle} ${shareUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Share on WhatsApp
              </a>
            </Button>
            <Button variant="secondary" onClick={handleCopyLink}>
              Copy link
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Report listing</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Reason
              </label>
              <select
                value={reportReason}
                onChange={(event) => setReportReason(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              >
                <option>Suspicious information</option>
                <option>Wrong price/details</option>
                <option>Spam or duplicate</option>
                <option>Scam risk</option>
                <option>Other</option>
              </select>
            </div>
            <Textarea
              rows={4}
              value={reportDetails}
              onChange={(event) => setReportDetails(event.target.value)}
              placeholder="Add more details"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setReportOpen(false)}
                disabled={reportLoading}
              >
                Cancel
              </Button>
              <Button onClick={handleReport} disabled={reportLoading}>
                {reportLoading ? "Submitting..." : "Submit report"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
