"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@propad/ui";
import { getImageUrl } from "@/lib/image-url";
import { useMessagingEntry } from "@/features/messaging/use-messaging-entry";

type AgencyItem = {
  id: string;
  slug?: string | null;
  name: string;
  logoUrl?: string | null;
  phone?: string | null;
  verified: boolean;
  trustScore: number;
  ratingAvg: number | null;
  reviewsCount: number;
  location: {
    suburb?: string | null;
    city?: string | null;
    province?: string | null;
    distanceKm?: number | null;
  };
  stats: {
    activeListingsCount: number;
    verifiedListingsCount: number;
    forSaleCount: number;
    toRentCount: number;
  };
  team: {
    count: number;
    top: Array<{ id: string; name: string; profilePhoto?: string | null }>;
  };
  topAreas: string[];
};

export function AgencyCard({
  agency,
  isShortlisted,
  onToggleShortlist,
}: {
  agency: AgencyItem;
  isShortlisted: boolean;
  onToggleShortlist: (id: string) => void;
}) {
  const [startingChat, setStartingChat] = useState(false);
  const { openMessageDrawer } = useMessagingEntry();

  const onMessage = async () => {
    if (startingChat) return;
    setStartingChat(true);
    try {
      openMessageDrawer({ companyId: agency.id });
    } finally {
      setStartingChat(false);
    }
  };

  const profilePath = `/profiles/companies/${agency.slug || agency.id}`;

  return (
    <article className="rounded-2xl border border-border bg-card p-5 text-card-foreground">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <div className="h-14 w-14 overflow-hidden rounded-xl border border-border bg-background">
            {agency.logoUrl ? (
              <img
                src={getImageUrl(agency.logoUrl)}
                alt={agency.name}
                className="h-full w-full object-contain p-1"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-muted-foreground">
                {agency.name.slice(0, 1)}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {agency.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {[
                agency.location.suburb,
                agency.location.city,
                agency.location.province,
              ]
                .filter(Boolean)
                .join(", ") || "Zimbabwe"}
              {agency.location.distanceKm != null
                ? ` • ${Math.round(agency.location.distanceKm)}km`
                : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.2em]">
              {agency.verified ? (
                <span className="rounded-full bg-emerald-600 px-2 py-1 text-white">
                  Verified
                </span>
              ) : null}
              {agency.ratingAvg != null && agency.ratingAvg >= 4.5 ? (
                <span className="rounded-full border border-border bg-background px-2 py-1 text-muted-foreground">
                  Top rated
                </span>
              ) : null}
              {agency.stats.verifiedListingsCount >= 8 ? (
                <span className="rounded-full border border-border bg-background px-2 py-1 text-muted-foreground">
                  Fast responder
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <Button
          size="sm"
          variant={isShortlisted ? "default" : "secondary"}
          onClick={() => onToggleShortlist(agency.id)}
        >
          {isShortlisted ? "Shortlisted" : "Compare"}
        </Button>
      </div>

      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <p className="text-muted-foreground">
          Active{" "}
          <span className="font-semibold text-foreground">
            {agency.stats.activeListingsCount}
          </span>
        </p>
        <p className="text-muted-foreground">
          Verified{" "}
          <span className="font-semibold text-foreground">
            {agency.stats.verifiedListingsCount}
          </span>
        </p>
        <p className="text-muted-foreground">
          Trust{" "}
          <span className="font-semibold text-foreground">
            {Math.round(agency.trustScore)}
          </span>
        </p>
        <p className="text-muted-foreground">
          Rating{" "}
          <span className="font-semibold text-foreground">
            {agency.ratingAvg?.toFixed(1) ?? "N/A"}
          </span>
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild>
          <Link href={profilePath}>View profile</Link>
        </Button>
        <Button variant="secondary" onClick={onMessage} disabled={startingChat}>
          {startingChat ? "Opening chat..." : "Message"}
        </Button>
        {agency.phone ? (
          <Button variant="secondary" asChild>
            <a href={`tel:${agency.phone.replace(/\s+/g, "")}`}>Call</a>
          </Button>
        ) : null}
        <Button variant="secondary" asChild>
          <Link href={`/listings?agencyId=${agency.id}&intent=FOR_SALE`}>
            View sales
          </Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href={`/listings?agencyId=${agency.id}&intent=TO_RENT`}>
            View rentals
          </Link>
        </Button>
      </div>

      {agency.topAreas.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {agency.topAreas.map((area) => (
            <span
              key={`${agency.id}-${area}`}
              className="rounded-full border border-border bg-background px-2 py-1 text-xs text-muted-foreground"
            >
              {area}
            </span>
          ))}
        </div>
      ) : null}

      {agency.team.top.length ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Team
          </span>
          {agency.team.top.slice(0, 3).map((agent) => (
            <Link
              key={agent.id}
              href={`/profiles/users/${agent.id}`}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-2 py-1"
            >
              <span className="h-5 w-5 overflow-hidden rounded-full bg-muted">
                {agent.profilePhoto ? (
                  <img
                    src={getImageUrl(agent.profilePhoto)}
                    alt={agent.name}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </span>
              <span className="text-xs text-foreground">{agent.name}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </article>
  );
}
