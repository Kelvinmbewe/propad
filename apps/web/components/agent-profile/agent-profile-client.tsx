"use client";

import { useState } from "react";
import { Button, notify } from "@propad/ui";
import { AgentHero } from "@/components/agent-profile/agent-hero";
import { AgentListingsPanel } from "@/components/agent-profile/agent-listings-panel";
import { AgentPerformanceCard } from "@/components/agent-profile/agent-performance-card";
import { AgencyAffiliationCard } from "@/components/agent-profile/agency-affiliation-card";
import { NearbyAgentsCard } from "@/components/agent-profile/nearby-agents-card";
import { ListingLocationMap } from "@/components/property-detail/listing-location-map";
import {
  useAgentPerformance,
  useAgentSummary,
  useNearbyAgents,
} from "@/hooks/use-agent-profile";
import { useMessagingEntry } from "@/features/messaging/use-messaging-entry";

export function AgentProfileClient({
  agentId,
  initialSummary,
  initialListings,
  initialPerformance,
  initialNearby,
}: {
  agentId: string;
  initialSummary: any;
  initialListings: any;
  initialPerformance: any;
  initialNearby: any;
}) {
  const [startingChat, setStartingChat] = useState(false);
  const { openMessageDrawer } = useMessagingEntry();
  const summaryQuery = useAgentSummary(agentId, initialSummary);
  const performanceQuery = useAgentPerformance(agentId, initialPerformance);
  const nearbyQuery = useNearbyAgents(agentId, "sale", initialNearby);

  const profile = summaryQuery.data;

  const onMessage = async () => {
    if (startingChat) return;
    setStartingChat(true);
    try {
      openMessageDrawer({ recipientId: agentId });
    } finally {
      setStartingChat(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 pb-12 pt-24 sm:px-6 lg:px-8">
      <AgentHero
        profile={profile}
        onMessage={onMessage}
        isStartingChat={startingChat}
        onViewListings={() =>
          document
            .getElementById("agent-listings")
            ?.scrollIntoView({ behavior: "smooth" })
        }
      />

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4 text-card-foreground">
          <h2 className="text-base font-semibold text-foreground">
            Request a market appraisal
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Need help listing your property? Get guidance from this agent.
          </p>
          <Button className="mt-3" onClick={onMessage} disabled={startingChat}>
            {startingChat ? "Opening chat..." : "Message agent"}
          </Button>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 text-card-foreground">
          <h2 className="text-base font-semibold text-foreground">
            Need help finding a property?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Send your requirements and get matched to suitable listings.
          </p>
          <Button
            variant="secondary"
            className="mt-3"
            onClick={onMessage}
            disabled={startingChat}
          >
            {startingChat ? "Opening chat..." : "Message agent"}
          </Button>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-5 text-card-foreground">
            <h2 className="text-lg font-semibold text-foreground">
              Professional summary
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {profile?.bio ||
                "This agent has not added a professional summary yet."}
            </p>
          </section>

          <AgentListingsPanel
            agentId={agentId}
            canUseAgency={Boolean(profile?.affiliation?.agencyId)}
            initialData={initialListings}
          />

          <section className="rounded-2xl border border-border bg-card p-5 text-card-foreground">
            <h2 className="text-lg font-semibold text-foreground">Reviews</h2>
            {(profile?.reviews ?? []).length ? (
              <div className="mt-3 space-y-3">
                {(profile.reviews ?? []).slice(0, 6).map((review: any) => (
                  <div
                    key={review.id}
                    className="rounded-xl border border-border bg-background p-3"
                  >
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{review.author ?? "Anonymous"}</span>
                      <span>
                        {new Date(
                          review.createdAt ?? Date.now(),
                        ).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-foreground">
                      {review.comment}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                No reviews yet. Reviews are earned from completed rental or
                purchase experiences.
              </p>
            )}
          </section>

          <ListingLocationMap
            lat={undefined}
            lng={undefined}
            locationLabel={profile?.location || "Zimbabwe"}
          />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <AgentPerformanceCard stats={performanceQuery.data} />
          <AgencyAffiliationCard affiliation={profile?.affiliation} />
          <NearbyAgentsCard data={nearbyQuery.data} />
          <section className="rounded-2xl border border-border bg-card p-4 text-card-foreground">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Trust explainer
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Trust scores reflect verification depth, completed transactions,
              and review quality to help you choose safer partners.
            </p>
            <Button
              variant="secondary"
              className="mt-3"
              onClick={() =>
                notify.success(
                  "See verification guide on homepage trust section.",
                )
              }
            >
              Why trust matters
            </Button>
          </section>
        </aside>
      </section>
    </div>
  );
}
