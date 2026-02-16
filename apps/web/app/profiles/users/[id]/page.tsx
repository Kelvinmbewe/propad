import { Metadata } from "next";
import { notFound } from "next/navigation";
import { LandingNav } from "@/components/landing-nav";
import { SiteFooter } from "@/components/site-footer";
import { AgentProfileClient } from "@/components/agent-profile/agent-profile-client";
import {
  getAgentSummary,
  fetchListingDetails,
  getNearbyPartners,
} from "@/app/api/profiles/agents/[id]/_lib";

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

function average(items: number[]) {
  if (!items.length) return null;
  return items.reduce((sum, value) => sum + value, 0) / items.length;
}

export default async function PublicAgentProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const summary = await getAgentSummary(params.id);
  if (!summary) return notFound();

  const listingDetails = await fetchListingDetails(
    (summary.listings ?? []).map((item) => item.id),
  );
  const initialListings = {
    items: listingDetails.map((item) => ({
      id: item.id,
      title: item.title,
      price: Number(item.price ?? 0),
      currency: item.currency ?? "USD",
      listingIntent: item.listingIntent === "TO_RENT" ? "TO_RENT" : "FOR_SALE",
      bedrooms: item.bedrooms ?? null,
      bathrooms: item.bathrooms ?? null,
      areaSqm: item.areaSqm ?? item.commercialFields?.floorAreaSqm ?? null,
      status: item.status,
      trustScore: Number(item.trustScore ?? item.verificationScore ?? 0),
      verificationLevel: item.verificationLevel,
      imageUrl: item.media?.[0]?.url ?? null,
      locationText: [
        item.suburbName ?? item.location?.suburb?.name,
        item.cityName ?? item.location?.city?.name,
        item.provinceName ?? item.location?.province?.name,
      ]
        .filter(Boolean)
        .join(", "),
      createdAt: item.createdAt,
    })),
  };

  const salePrices = initialListings.items
    .filter((item) => item.listingIntent === "FOR_SALE")
    .map((item) => item.price)
    .filter((price) => Number.isFinite(price) && price > 0);
  const rentPrices = initialListings.items
    .filter((item) => item.listingIntent === "TO_RENT")
    .map((item) => item.price)
    .filter((price) => Number.isFinite(price) && price > 0);
  const now = Date.now();
  const initialPerformance = {
    averageSalePrice: average(salePrices),
    averageRentPrice: average(rentPrices),
    listingsLast30d: initialListings.items.filter((item) => {
      const createdAt = new Date(item.createdAt ?? 0).getTime();
      return (
        Number.isFinite(createdAt) &&
        now - createdAt <= 30 * 24 * 60 * 60 * 1000
      );
    }).length,
    activeListings: initialListings.items.length,
    verifiedListings: initialListings.items.filter((item) =>
      ["VERIFIED", "TRUSTED"].includes(String(item.verificationLevel)),
    ).length,
  };

  const initialNearby = await getNearbyPartners({
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
