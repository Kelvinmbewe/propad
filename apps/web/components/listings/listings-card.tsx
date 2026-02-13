"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import type { Property } from "@propad/sdk";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  notify,
} from "@propad/ui";
import {
  Bath,
  BedDouble,
  Heart,
  MapPin,
  MessageSquare,
  Ruler,
  Star,
} from "lucide-react";
import clsx from "clsx";
import { TrustBadge } from "@/components/trust/TrustBadge";
import { PropertyMessenger } from "@/components/property-messenger";
import { getRequiredPublicApiBaseUrl } from "@/lib/api-base-url";
import { formatCurrency } from "@/lib/formatters";
import { getImageUrl } from "@/lib/image-url";
import {
  listingIsFeatured,
  listingTrustScore,
  listingVerificationBreakdown,
} from "@/lib/listings";

export function ListingsCard({
  property,
  highlighted,
  listMode,
  onHover,
  onLeave,
}: {
  property: Property;
  highlighted?: boolean;
  listMode?: boolean;
  onHover?: () => void;
  onLeave?: () => void;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [viewingOpen, setViewingOpen] = useState(false);
  const [viewingDate, setViewingDate] = useState("");
  const [viewingNotes, setViewingNotes] = useState("");
  const [viewingLoading, setViewingLoading] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const image = property.media[0]?.url
    ? getImageUrl(property.media[0].url)
    : null;
  const location =
    property.location.suburb?.name ??
    property.location.city?.name ??
    property.location.province?.name ??
    "Zimbabwe";
  const city = property.location.city?.name;
  const province = property.location.province?.name;
  const trustScore = listingTrustScore(property);
  const trustBreakdown = listingVerificationBreakdown(property);
  const isFeatured = listingIsFeatured(property);
  const isPending = property.status === "PENDING_VERIFY";
  const isVerified =
    !isPending && ["VERIFIED", "TRUSTED"].includes(property.verificationLevel);
  const intentLabel =
    property.listingIntent === "TO_RENT" ? "TO RENT" : "FOR SALE";
  const curatedBy =
    (property as Property & { agency?: { name?: string | null } | null }).agency
      ?.name ??
    (property as Property & { assignedAgent?: { name?: string | null } | null })
      .assignedAgent?.name ??
    "PropAd";
  const accessToken = (session as { accessToken?: string } | null)?.accessToken;
  const landlordId =
    (property as Property & { landlord?: { id?: string | null } | null })
      .landlord?.id ??
    (property as Property & { landlordId?: string | null }).landlordId ??
    null;
  const agentOwnerId =
    (property as Property & { agentOwner?: { id?: string | null } | null })
      .agentOwner?.id ??
    (property as Property & { agentOwnerId?: string | null }).agentOwnerId ??
    null;
  const detailsHref = `/properties/${property.id}`;

  const promptSignIn = () => {
    signIn(undefined, {
      callbackUrl:
        typeof window !== "undefined" ? window.location.href : detailsHref,
    });
  };

  const shouldSkipCardNavigation = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    return Boolean(
      target.closest(
        "a,button,input,textarea,select,[role='button'],[data-no-card-nav='true']",
      ),
    );
  };

  const handleScheduleViewing = async () => {
    if (!session?.user?.id || !accessToken) {
      promptSignIn();
      return;
    }
    if (!viewingDate) {
      notify.error("Choose a preferred viewing date and time.");
      return;
    }

    setViewingLoading(true);
    try {
      const scheduledAt = new Date(viewingDate).toISOString();
      const response = await fetch(
        `${getRequiredPublicApiBaseUrl()}/properties/${property.id}/viewings/schedule`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            scheduledAt,
            notes: viewingNotes || undefined,
            locationLat:
              typeof property.location.lat === "number"
                ? property.location.lat
                : undefined,
            locationLng:
              typeof property.location.lng === "number"
                ? property.location.lng
                : undefined,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to request viewing");
      }

      notify.success("Viewing request sent.");
      setViewingOpen(false);
      setViewingNotes("");
    } catch {
      notify.error("We could not request a viewing right now.");
    } finally {
      setViewingLoading(false);
    }
  };

  return (
    <article
      className={clsx(
        "group cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition",
        listMode ? "md:flex" : "",
        highlighted ? "ring-2 ring-cyan-500 shadow-lg" : "hover:shadow-md",
      )}
      role="link"
      tabIndex={0}
      aria-label={`Open listing ${property.title}`}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onFocus={onHover}
      onBlur={onLeave}
      onClick={(event) => {
        if (shouldSkipCardNavigation(event.target)) return;
        router.push(detailsHref);
      }}
      onKeyDown={(event) => {
        if (shouldSkipCardNavigation(event.target)) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(detailsHref);
        }
      }}
    >
      <div
        className={clsx("relative", listMode ? "md:w-[320px] md:shrink-0" : "")}
      >
        {image ? (
          <Image
            src={image}
            alt={property.title}
            width={640}
            height={420}
            className="h-56 w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-56 w-full items-center justify-center bg-slate-100 text-sm text-slate-500">
            No image available
          </div>
        )}

        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
          {isFeatured ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-900">
              <Star className="h-3 w-3" />
              Featured
            </span>
          ) : null}
          {isVerified ? (
            <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
              Verified
            </span>
          ) : null}
          {isPending ? (
            <span className="rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-800">
              Pending verify
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => {
            if (!session?.user?.id) {
              promptSignIn();
              return;
            }
            notify.success(
              "Favorites will be available in your dashboard shortly.",
            );
          }}
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-700 hover:bg-white"
          aria-label="Save listing"
        >
          <Heart className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-2xl font-semibold text-slate-900">
              {formatCurrency(property.price, property.currency)}
            </p>
            <p className="text-sm text-slate-700">
              {(property.bedrooms ?? 0) > 0 ? `${property.bedrooms} bed ` : ""}
              {property.type.replaceAll("_", " ").toLowerCase()}
            </p>
            <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
              <MapPin className="h-4 w-4" />
              {location}
              {city && city !== location ? `, ${city}` : ""}
              {province ? `, ${province}` : ""}
            </p>
          </div>
          <TrustBadge
            trustScore={trustScore}
            maxScore={110}
            breakdown={trustBreakdown}
            size="sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
          {property.bedrooms ? (
            <span className="inline-flex items-center gap-1">
              <BedDouble className="h-4 w-4" />
              {property.bedrooms}
            </span>
          ) : null}
          {property.bathrooms ? (
            <span className="inline-flex items-center gap-1">
              <Bath className="h-4 w-4" />
              {property.bathrooms}
            </span>
          ) : null}
          {property.areaSqm ? (
            <span className="inline-flex items-center gap-1">
              <Ruler className="h-4 w-4" />
              {Math.round(property.areaSqm)} m2
            </span>
          ) : null}
          {property.commercialFields?.floorAreaSqm ? (
            <span className="inline-flex items-center gap-1">
              <Ruler className="h-4 w-4" />
              {Math.round(property.commercialFields.floorAreaSqm)} m2 floor
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
            {intentLabel}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
            {isVerified
              ? "Verified"
              : isPending
                ? "Pending verify"
                : "Standard"}
          </span>
        </div>

        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
          Curated by {curatedBy}
        </p>

        <div className="mt-auto flex flex-wrap gap-2">
          <Button
            asChild
            size="sm"
            className="rounded-full bg-slate-900 text-white hover:bg-slate-800"
          >
            <Link href={detailsHref}>View listing</Link>
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="rounded-full"
            onClick={() => {
              if (!session?.user?.id) {
                promptSignIn();
                return;
              }
              const defaultDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
                .toISOString()
                .slice(0, 16);
              setViewingDate(defaultDate);
              setViewingOpen(true);
            }}
          >
            Request viewing
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="rounded-full"
            onClick={() => {
              if (!session?.user?.id) {
                promptSignIn();
                return;
              }
              setMessageOpen((current) => !current);
            }}
          >
            <MessageSquare className="mr-1 h-3.5 w-3.5" />
            {messageOpen ? "Hide chat" : "Message"}
          </Button>
        </div>

        {messageOpen ? (
          <PropertyMessenger
            propertyId={property.id}
            landlordId={landlordId}
            agentOwnerId={agentOwnerId}
            className="mt-2"
          />
        ) : null}
      </div>

      <Dialog open={viewingOpen} onOpenChange={setViewingOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Request viewing</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Preferred date and time
              <input
                type="datetime-local"
                value={viewingDate}
                onChange={(event) => setViewingDate(event.target.value)}
                className="h-10 rounded-lg border border-slate-200 px-3"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Notes (optional)
              <textarea
                rows={3}
                value={viewingNotes}
                onChange={(event) => setViewingNotes(event.target.value)}
                className="rounded-lg border border-slate-200 p-3"
                placeholder="Any preferred time window or access notes"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setViewingOpen(false)}
                disabled={viewingLoading}
              >
                Cancel
              </Button>
              <Button onClick={handleScheduleViewing} disabled={viewingLoading}>
                {viewingLoading ? "Sending..." : "Send request"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </article>
  );
}
