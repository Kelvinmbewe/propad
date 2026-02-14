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
import { PropertyMessenger } from "@/components/property-messenger";
import { getRequiredPublicApiBaseUrl } from "@/lib/api-base-url";
import { useAuthenticatedSDK } from "@/hooks/use-authenticated-sdk";

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
  const [messageOpen, setMessageOpen] = useState(false);
  const [viewingOpen, setViewingOpen] = useState(false);
  const [viewingDate, setViewingDate] = useState("");
  const [viewingNotes, setViewingNotes] = useState("");
  const [viewingLoading, setViewingLoading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("Suspicious information");
  const [reportDetails, setReportDetails] = useState("");
  const [reportLoading, setReportLoading] = useState(false);

  const accessToken = (session as { accessToken?: string } | null)?.accessToken;
  const isAuthed = Boolean(session?.user?.id);
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
    if (!viewingDate) {
      notify.error("Choose a date and time first.");
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
            scheduledAt: new Date(viewingDate).toISOString(),
            notes: viewingNotes || undefined,
          }),
        },
      );
      if (!response.ok) throw new Error("failed");
      notify.success("Viewing request sent.");
      setViewingOpen(false);
      setViewingNotes("");
    } catch {
      notify.error("Could not send viewing request now.");
    } finally {
      setViewingLoading(false);
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
              onClick={() => setMessageOpen((v) => !v)}
            >
              {messageOpen ? "Hide message" : "Message"}
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                setViewingDate(
                  new Date(Date.now() + 24 * 60 * 60 * 1000)
                    .toISOString()
                    .slice(0, 16),
                );
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
              setMessageOpen((v) => !v);
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

      {messageOpen && isAuthed ? (
        <PropertyMessenger
          propertyId={propertyId}
          landlordId={landlordId}
          agentOwnerId={agentOwnerId}
        />
      ) : null}

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
            <Input
              type="datetime-local"
              value={viewingDate}
              onChange={(event) => setViewingDate(event.target.value)}
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
