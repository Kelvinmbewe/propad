import { Metadata } from "next";
import { notFound } from "next/navigation";
import { LandingNav } from "@/components/landing-nav";
import { SiteFooter } from "@/components/site-footer";
import { AgentProfileClient } from "@/components/agent-profile/agent-profile-client";
import { getAgentSummary, getNearbyPartners } from "@/app/api/agents/_lib";
import { serverPublicApiRequest } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const profile = await getAgentSummary(params.id);
  if (!profile) return { title: "Agent Not Found | PropAd" };
  return {
    title: `${profile.name} | PropAd Agent Directory`,
    description:
      profile.bio ||
      `Browse ${profile.name}'s verified profile, listings, and trust track record on PropAd.`,
  };
}

export default async function PublicAgentProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const summary = await getAgentSummary(params.id);
  if (!summary) return notFound();

  const initialListings = await serverPublicApiRequest<any>(
    `/users/${params.id}/listings?verifiedOnly=true&sort=TRUST&page=1&pageSize=12`,
  ).catch(() => ({
    items: [],
    meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 },
    stats: {
      activeListingsCount: 0,
      verifiedListingsCount: 0,
      listingsLast30DaysCount: 0,
      avgSalePrice: null,
      avgRentPrice: null,
    },
  }));

  const initialPerformance = {
    averageSalePrice: initialListings?.stats?.avgSalePrice ?? null,
    averageRentPrice: initialListings?.stats?.avgRentPrice ?? null,
    listingsLast30d: initialListings?.stats?.listingsLast30DaysCount ?? 0,
    activeListings: initialListings?.stats?.activeListingsCount ?? 0,
    verifiedListings: initialListings?.stats?.verifiedListingsCount ?? 0,
  };

  const initialNearby = await getNearbyPartners({
    lat:
      typeof summary.lat === "number"
        ? summary.lat
        : summary.locationResolved?.lat,
    lng:
      typeof summary.lng === "number"
        ? summary.lng
        : summary.locationResolved?.lng,
    q: summary.location ?? undefined,
    mode: "sale",
    limit: 5,
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />
      <AgentProfileClient
        agentId={params.id}
        initialSummary={summary}
        initialListings={initialListings}
        initialPerformance={initialPerformance}
        initialNearby={initialNearby}
      />
      <SiteFooter showFollow showVerificationLink={false} />
    </div>
  );
}
