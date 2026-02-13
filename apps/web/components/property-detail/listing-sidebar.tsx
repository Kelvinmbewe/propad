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
  const [messageOpen, setMessageOpen] = useState(false);
  const [viewingOpen, setViewingOpen] = useState(false);
  const [viewingDate, setViewingDate] = useState("");
  const [viewingNotes, setViewingNotes] = useState("");
  const [viewingLoading, setViewingLoading] = useState(false);

  const accessToken = (session as { accessToken?: string } | null)?.accessToken;
  const isAuthed = Boolean(session?.user?.id);
  const isOwner =
    Boolean(session?.user?.id) &&
    (session?.user?.id === landlordId || session?.user?.id === agentOwnerId);

  const callHref = useMemo(() => {
    if (!entity.phone) return null;
    return `tel:${entity.phone.replace(/\s+/g, "")}`;
  }, [entity.phone]);

  const scheduleViewing = async () => {
    if (!isAuthed || !accessToken) {
      signIn(undefined, {
        callbackUrl:
          typeof window !== "undefined"
            ? window.location.href
            : `/properties/${propertyId}`,
      });
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
            onClick={() => setMessageOpen((v) => !v)}
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
          <Button
            variant="secondary"
            onClick={() => {
              if (!isAuthed) {
                signIn(undefined, {
                  callbackUrl:
                    typeof window !== "undefined"
                      ? window.location.href
                      : `/properties/${propertyId}`,
                });
                return;
              }
              notify.success("Saved properties will appear in your dashboard.");
            }}
          >
            Save property
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              if (typeof window === "undefined") return;
              await navigator.clipboard.writeText(window.location.href);
              notify.success("Link copied");
            }}
          >
            Share property
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              notify.success("Report flow will be enabled shortly.")
            }
          >
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
    </aside>
  );
}
