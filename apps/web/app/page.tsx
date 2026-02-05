import { LandingNav } from "@/components/landing-nav";
import { HomePageClient } from "@/components/home/homepage-client";
import { AdSlot } from "@/components/ad-slot";
import { Instagram, Linkedin, Twitter } from "lucide-react";
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

      <footer
        id="contact"
        className="mt-16 bg-gradient-to-br from-slate-950 via-emerald-900 to-cyan-900 py-14 text-white"
      >
        <div className="mx-auto w-full max-w-6xl px-6 sm:px-12 lg:px-16">
          <div className="grid gap-10 md:grid-cols-[1.3fr_repeat(4,minmax(0,1fr))]">
            <div className="flex flex-col gap-3">
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
            <div className="space-y-3 text-sm text-emerald-100/80">
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">
                Homes
              </p>
              <div className="flex flex-col gap-2">
                <a href="/listings?intent=FOR_SALE">Homes for sale</a>
                <a href="/listings?intent=TO_RENT">Homes for rent</a>
                <a href="/listings">Browse all</a>
              </div>
            </div>
            <div className="space-y-3 text-sm text-emerald-100/80">
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">
                Partners
              </p>
              <div className="flex flex-col gap-2">
                <a href="/agencies">Agents & agencies</a>
                <a href="/dashboard/verification">Verification</a>
                <a href="/dashboard/advertiser">Advertise</a>
              </div>
            </div>
            <div className="space-y-3 text-sm text-emerald-100/80">
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">
                About
              </p>
              <div className="flex flex-col gap-2">
                <a href="/about">About PropAd</a>
                <a href="#trust">How verification works</a>
                <a href="/contact">Contact</a>
              </div>
            </div>
            <div className="space-y-3 text-sm text-emerald-100/80">
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">
                Follow
              </p>
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
                Ad disclosure: Sponsored listings are marked.
              </p>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 text-xs text-emerald-100/70 sm:flex-row">
            <p>© {new Date().getFullYear()} PropAd. All rights reserved.</p>
            <p>Built for Zimbabwe&apos;s verified property marketplace.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
