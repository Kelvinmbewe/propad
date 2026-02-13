"use client";

import Link from "next/link";
import { Building2, UserCheck } from "lucide-react";
import type { HomeAgent, HomeAgency } from "@/lib/homepage-data";
import { trackLocationEvent } from "@/lib/home-events";

interface TopPartnersSectionProps {
  agents: HomeAgent[];
  agencies: HomeAgency[];
  activeTab: "agents" | "agencies";
  onTabChange: (tab: "agents" | "agencies") => void;
  locationLabel: string;
}

export function TopPartnersSection({
  agents,
  agencies,
  activeTab,
  onTabChange,
  locationLabel,
}: TopPartnersSectionProps) {
  const hasAgents = agents.length > 0;
  const hasAgencies = agencies.length > 0;

  return (
    <section
      id="agents"
      className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 sm:px-12 lg:px-16"
    >
      <div className="flex flex-col gap-3">
        <span className="text-xs uppercase tracking-[0.35em] text-emerald-500">
          Trusted partners
        </span>
        <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">
          Top agents and agencies near {locationLabel}
        </h2>
        <p className="max-w-2xl text-base text-muted-foreground">
          Ranked by ratings, verified listings, and average trust scores.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onTabChange("agents")}
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] ${
              activeTab === "agents"
                ? "bg-emerald-600 text-white"
                : "border border-border bg-card text-muted-foreground"
            }`}
          >
            Agents
          </button>
          <button
            type="button"
            onClick={() => onTabChange("agencies")}
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] ${
              activeTab === "agencies"
                ? "bg-emerald-600 text-white"
                : "border border-border bg-card text-muted-foreground"
            }`}
          >
            Agencies
          </button>
        </div>
        <Link
          href="/agencies"
          className="text-sm font-semibold text-emerald-600 hover:text-emerald-500"
        >
          Find an agent near me →
        </Link>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {activeTab === "agents" && !hasAgents ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            No verified agents are available near this location yet.
          </div>
        ) : null}
        {activeTab === "agencies" && !hasAgencies ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            No verified agencies are available near this location yet.
          </div>
        ) : null}
        {activeTab === "agents"
          ? agents.map((agent) => (
              <Link
                key={agent.id}
                href={`/agents/${agent.id}`}
                onClick={() =>
                  trackLocationEvent({
                    type: "VIEW_AGENT",
                    agentId: agent.id,
                  })
                }
                className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      Agent
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-card-foreground">
                      {agent.name ?? "Verified agent"}
                    </h3>
                  </div>
                  <UserCheck className="h-6 w-6 text-emerald-500" />
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Rating</span>
                  <span className="font-semibold text-card-foreground">
                    {agent.rating?.toFixed(1) ?? "0.0"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Verified listings</span>
                  <span className="font-semibold text-card-foreground">
                    {agent.verifiedListingsCount}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Avg listing trust</span>
                  <span className="font-semibold text-card-foreground">
                    {Math.round(agent.averageListingTrust)}
                  </span>
                </div>
              </Link>
            ))
          : agencies.map((agency) => (
              <Link
                key={agency.id}
                href={`/agencies/${agency.id}`}
                onClick={() =>
                  trackLocationEvent({
                    type: "VIEW_AGENCY",
                    agencyId: agency.id,
                  })
                }
                className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      Agency
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-card-foreground">
                      {agency.name}
                    </h3>
                  </div>
                  <Building2 className="h-6 w-6 text-emerald-500" />
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Rating</span>
                  <span className="font-semibold text-card-foreground">
                    {agency.rating?.toFixed(1) ?? "0.0"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Verified listings</span>
                  <span className="font-semibold text-card-foreground">
                    {agency.verifiedListingsCount}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Avg listing trust</span>
                  <span className="font-semibold text-card-foreground">
                    {Math.round(agency.averageListingTrust)}
                  </span>
                </div>
              </Link>
            ))}
      </div>
    </section>
  );
}
