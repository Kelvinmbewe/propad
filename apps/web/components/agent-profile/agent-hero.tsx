"use client";

import { Button } from "@propad/ui";
import { Calendar, MapPin, Phone } from "lucide-react";
import { getImageUrl } from "@/lib/image-url";
import { PROPERTY_PLACEHOLDER_IMAGE } from "@/lib/property-placeholder";

export function AgentHero({
  profile,
  onMessage,
  onViewListings,
  isStartingChat = false,
}: {
  profile: any;
  onMessage: () => void;
  onViewListings: () => void;
  isStartingChat?: boolean;
}) {
  const trustScore = Number(profile?.trust?.score ?? 0);
  const joinedYear = profile?.joinedAt
    ? new Date(profile.joinedAt).getFullYear()
    : null;
  const avgRating = Number(profile?.trust?.explanation?.avgRating ?? 0);

  return (
    <section className="rounded-2xl border border-border bg-card p-5 text-card-foreground">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-4">
          <div className="h-20 w-20 overflow-hidden rounded-full border border-border bg-muted">
            <img
              src={
                profile?.profilePhoto
                  ? getImageUrl(profile.profilePhoto)
                  : PROPERTY_PLACEHOLDER_IMAGE
              }
              alt={profile?.name ?? "Agent"}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-foreground">
                {profile?.name ?? "Agent"}
              </h1>
              <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {profile?.role ?? "AGENT"}
              </span>
              <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                {trustScore >= 70 ? "Verified" : "Unverified"}
              </span>
            </div>
            <p className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {profile?.location || "Zimbabwe"}
              </span>
              {joinedYear ? (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-4 w-4" /> Joined {joinedYear}
                </span>
              ) : null}
              <span>
                Active listings:{" "}
                {profile?.stats?.activeListingsCount ??
                  (profile?.listings ?? []).length}
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="font-semibold text-emerald-600">
                {profile?.trust?.tier ?? "Standard"}
              </span>
              <span className="text-foreground">{trustScore}/100</span>
              <span className="text-muted-foreground">
                {profile?.stats?.reviewsCount ??
                  (profile?.reviews ?? []).length}{" "}
                reviews
              </span>
              <span className="text-muted-foreground">
                {avgRating.toFixed(1)} avg rating
              </span>
            </div>
            <div className="h-2 w-56 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${Math.max(0, Math.min(100, trustScore))}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 lg:w-auto">
          {profile?.phone ? (
            <Button
              asChild
              className="bg-emerald-600 text-white hover:bg-emerald-500"
            >
              <a href={`tel:${String(profile.phone).replace(/\s+/g, "")}`}>
                <Phone className="mr-2 h-4 w-4" />
                Call agent
              </a>
            </Button>
          ) : null}
          <Button
            variant="secondary"
            onClick={onMessage}
            disabled={isStartingChat}
          >
            {isStartingChat ? "Opening chat..." : "Message agent"}
          </Button>
          <Button variant="secondary" onClick={onViewListings}>
            View listings
          </Button>
        </div>
      </div>
    </section>
  );
}
