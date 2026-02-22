import { LandingNav } from "@/components/landing-nav";
import { HomePageClient } from "@/components/home/homepage-client";
import { AdSlot } from "@/components/ad-slot";
import { SiteFooter } from "@/components/site-footer";
import { DEFAULT_HOME_LOCATION } from "@/lib/homepage-locations";
import {
  featuredListingsNear,
  homepageCounts,
  nearbyVerifiedListings,
  topAgenciesNear,
  topAgentsNear,
} from "@/lib/homepage-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const fallbackLocation = DEFAULT_HOME_LOCATION;

  const [
    nearbyResult,
    featuredResult,
    agentsResult,
    agenciesResult,
    countsResult,
  ] = await Promise.allSettled([
    nearbyVerifiedListings({
      coords: fallbackLocation.coords,
      filters: { limit: 18 },
    }),
    featuredListingsNear({ coords: fallbackLocation.coords }),
    topAgentsNear({ coords: fallbackLocation.coords, filters: { limit: 6 } }),
    topAgenciesNear({
      coords: fallbackLocation.coords,
      filters: { limit: 6 },
    }),
    homepageCounts({ coords: fallbackLocation.coords, radiusKm: 40 }),
  ]);

  const initialNearbyListings =
    nearbyResult.status === "fulfilled" ? nearbyResult.value.items ?? [] : [];
  const initialFeaturedListings =
    featuredResult.status === "fulfilled" ? featuredResult.value ?? [] : [];
  const initialTopAgents =
    agentsResult.status === "fulfilled" ? agentsResult.value ?? [] : [];
  const initialTopAgencies =
    agenciesResult.status === "fulfilled" ? agenciesResult.value ?? [] : [];
  const initialCounts =
    countsResult.status === "fulfilled" ? countsResult.value : undefined;

  return (
    <div className="relative">
      <LandingNav />
      <HomePageClient
        initialNearbyListings={initialNearbyListings}
        initialFeaturedListings={initialFeaturedListings}
        initialTopAgents={initialTopAgents}
        initialTopAgencies={initialTopAgencies}
        initialCounts={initialCounts}
      />

      <section className="mx-auto w-full max-w-6xl px-6 sm:px-12 lg:px-16">
        <AdSlot
          source="home-footer"
          adsenseEnabled={Boolean(process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID)}
          unitId={process.env.NEXT_PUBLIC_ADSENSE_FEED_SLOT}
          className="mx-auto max-w-4xl"
          fallbackInhouseAds={[
            {
              id: "footer-cta",
              title: "Verified listings move faster",
              body: "Upgrade verification to earn higher trust scores and more visibility.",
              ctaLabel: "Start verification",
              href: "/dashboard/verification",
              tone: "slate",
            },
          ]}
        />
      </section>

      <SiteFooter showFollow showVerificationLink />
    </div>
  );
}
