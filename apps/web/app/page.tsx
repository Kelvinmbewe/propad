import { LandingNav } from "@/components/landing-nav";
import { HomePageClient } from "@/components/home/homepage-client";
import { AdSlot } from "@/components/ad-slot";
import { Instagram, Linkedin, Twitter } from "lucide-react";
import { DEFAULT_HOME_LOCATION } from "@/lib/homepage-locations";
import {
  featuredListingsNear,
  nearbyVerifiedListings,
  topAgenciesNear,
  topAgentsNear,
} from "@/lib/homepage-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const fallbackLocation = DEFAULT_HOME_LOCATION;

  const [nearbyResult, featuredResult, agentsResult, agenciesResult] =
    await Promise.allSettled([
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
    ]);

  const initialNearbyListings =
    nearbyResult.status === "fulfilled" ? nearbyResult.value.items ?? [] : [];
  const initialFeaturedListings =
    featuredResult.status === "fulfilled" ? featuredResult.value ?? [] : [];
  const initialTopAgents =
    agentsResult.status === "fulfilled" ? agentsResult.value ?? [] : [];
  const initialTopAgencies =
    agenciesResult.status === "fulfilled" ? agenciesResult.value ?? [] : [];

  return (
    <div className="relative">
      <LandingNav />
      <HomePageClient
        initialNearbyListings={initialNearbyListings}
        initialFeaturedListings={initialFeaturedListings}
        initialTopAgents={initialTopAgents}
        initialTopAgencies={initialTopAgencies}
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

      <footer
        id="contact"
        className="mt-16 bg-gradient-to-br from-slate-950 via-emerald-900 to-cyan-900 py-12 text-white"
      >
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 sm:flex-row sm:items-center sm:justify-between sm:px-12 lg:px-16">
          <div className="flex flex-col gap-2">
            <p className="text-sm uppercase tracking-[0.35em] text-emerald-200">
              PropAd Zimbabwe
            </p>
            <p className="text-lg font-semibold">
              Aspirational real estate, choreographed end-to-end.
            </p>
            <p className="text-sm text-emerald-100/80">
              hello@propad.co.zw · +263 77 000 1234
            </p>
          </div>
          <div className="flex flex-col items-start gap-4 text-sm text-emerald-100/80 sm:items-end">
            <div className="flex items-center gap-3">
              <a
                href="https://twitter.com"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a
                href="https://instagram.com"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="https://linkedin.com"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
            <p className="text-xs">
              © {new Date().getFullYear()} PropAd. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
