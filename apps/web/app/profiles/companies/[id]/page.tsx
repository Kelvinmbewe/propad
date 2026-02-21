import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@propad/ui";
import { LandingNav } from "@/components/landing-nav";
import { SiteFooter } from "@/components/site-footer";
import { ListingLocationMap } from "@/components/property-detail/listing-location-map";
import { CompanyHeroCard } from "@/components/company-profile/company-hero-card";
import { CompanyListings } from "@/components/company-profile/company-listings";
import { PerformanceCard } from "@/components/company-profile/performance-card";
import { TeamPreview } from "@/components/company-profile/team-preview";
import { NearbyPartners } from "@/components/company-profile/nearby-partners";
import { QuickLinks } from "@/components/company-profile/quick-links";
import { TrustScoreBar } from "@/components/company-profile/trust-score-bar";
import { getCompanyProfilePageData } from "@/lib/queries/company-profile";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const payload = await getCompanyProfilePageData(params.id).catch(() => null);
  if (!payload) return { title: "Agency Not Found | PropAd" };
  return {
    title: `${payload.company.name} | PropAd Agency Profile`,
    description:
      payload.company.shortDescription ||
      payload.company.description ||
      `Browse ${payload.company.name} listings, performance, and trust profile on PropAd.`,
  };
}

function formatMoney(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "--";
  }
  return value.toLocaleString();
}

export default async function CompanyProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const data = await getCompanyProfilePageData(params.id).catch(() => null);
  if (!data) return notFound();

  const trustBreakdown = data.trust.breakdown ?? {};
  const trustSignals = {
    photos: Number(trustBreakdown.photos ?? trustBreakdown.media ?? 0) > 0,
    gps: Number(trustBreakdown.gps ?? trustBreakdown.location ?? 0) > 0,
    docs: Number(trustBreakdown.docs ?? trustBreakdown.kyc ?? 0) > 0,
    siteVisit:
      Number(trustBreakdown.siteVisit ?? trustBreakdown.transactions ?? 0) > 0,
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />

      <main className="mx-auto max-w-7xl space-y-6 px-4 pb-12 pt-24 sm:px-6 lg:px-8">
        <CompanyHeroCard
          companyId={params.id}
          company={data.company}
          activeListingsCount={data.stats.activeListingsCount}
        />

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-4 text-card-foreground">
            <h2 className="text-base font-semibold text-foreground">
              Request a market appraisal
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Need an expert estimate? Connect with this agency team.
            </p>
            <Button asChild className="mt-3">
              <Link
                href={`/appraisal/request?companyId=${encodeURIComponent(params.id)}`}
              >
                Start appraisal request
              </Link>
            </Button>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 text-card-foreground">
            <h2 className="text-base font-semibold text-foreground">
              Need help finding a property?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create alerts and get matched to verified listings in your area.
            </p>
            <Button asChild variant="secondary" className="mt-3">
              <Link href="/listings">Browse verified listings</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <CompanyListings
              companyId={params.id}
              initialData={{
                items: data.listings,
                meta: data.listingsMeta,
                stats: {
                  activeListingsCount: data.stats.activeListingsCount,
                  verifiedListingsCount: data.stats.verifiedListingsCount,
                  listingsLast30DaysCount: data.performance.listingsLast30d,
                  avgSalePrice: data.performance.avgSalePrice,
                  avgRentPrice: data.performance.avgRentPrice,
                },
              }}
            />

            <ListingLocationMap
              lat={data.location.lat}
              lng={data.location.lng}
              locationLabel={
                data.location.address ||
                [data.location.city, data.location.province]
                  .filter(Boolean)
                  .join(", ") ||
                "Zimbabwe"
              }
            />

            <section className="rounded-2xl border border-border bg-card p-5 text-card-foreground">
              <h2 className="text-lg font-semibold text-foreground">Reviews</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {data.stats.reviewsCount} reviews, average rating{" "}
                {data.stats.avgRating ?? "--"}
              </p>
              {(data.reviews ?? []).length ? (
                <div className="mt-3 space-y-3">
                  {data.reviews.slice(0, 6).map((review) => (
                    <div
                      key={review.id}
                      className="rounded-xl border border-border bg-background p-3"
                    >
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{review.author ?? "Anonymous"}</span>
                        <span>
                          {review.createdAt
                            ? new Date(review.createdAt).toLocaleDateString()
                            : ""}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-foreground">
                        {review.comment || "No written feedback."}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  No published reviews yet for this agency.
                </p>
              )}
            </section>
          </div>

          <aside className="space-y-4 lg:col-span-4 lg:sticky lg:top-24">
            <PerformanceCard
              data={{
                avgSalePrice: data.performance.avgSalePrice,
                avgRentPrice: data.performance.avgRentPrice,
                listingsLast30d: data.performance.listingsLast30d,
                listingsPerMonth: data.performance.listingsPerMonth,
                activeListingsCount: data.stats.activeListingsCount,
                verifiedListingsCount: data.stats.verifiedListingsCount,
              }}
            />

            <TeamPreview companyId={params.id} members={data.team} />

            <NearbyPartners data={data.nearby} />

            <QuickLinks city={data.quickLinks.city} />

            <section className="rounded-2xl border border-border bg-card p-4 text-card-foreground">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Trust & Compliance
              </h3>
              <div className="mt-3 space-y-3">
                <TrustScoreBar score={data.trust.score} />
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-border bg-background px-2 py-1">
                    Photos: {trustSignals.photos ? "Yes" : "No"}
                  </span>
                  <span className="rounded-full border border-border bg-background px-2 py-1">
                    GPS: {trustSignals.gps ? "Yes" : "No"}
                  </span>
                  <span className="rounded-full border border-border bg-background px-2 py-1">
                    Docs: {trustSignals.docs ? "Yes" : "No"}
                  </span>
                  <span className="rounded-full border border-border bg-background px-2 py-1">
                    Site visit: {trustSignals.siteVisit ? "Yes" : "No"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Complaint resolution:{" "}
                  {data.trust.complaintResolutionRate != null
                    ? `${Math.round(data.trust.complaintResolutionRate * 100)}%`
                    : "--"}
                </p>
                <Link href="/" className="text-sm font-medium text-emerald-600">
                  How verification works
                </Link>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-4 text-card-foreground">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Snapshot
              </h3>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <p>
                  Avg sale:{" "}
                  <span className="font-medium text-foreground">
                    {formatMoney(data.performance.avgSalePrice)}
                  </span>
                </p>
                <p>
                  Avg rent:{" "}
                  <span className="font-medium text-foreground">
                    {formatMoney(data.performance.avgRentPrice)}
                  </span>
                </p>
                <p>
                  Team size:{" "}
                  <span className="font-medium text-foreground">
                    {data.stats.teamCount}
                  </span>
                </p>
                <p>
                  Active listings:{" "}
                  <span className="font-medium text-foreground">
                    {data.stats.activeListingsCount}
                  </span>
                </p>
                <p>
                  Verified listings:{" "}
                  <span className="font-medium text-foreground">
                    {data.stats.verifiedListingsCount}
                  </span>
                </p>
                <p>
                  Listings last 30 days:{" "}
                  <span className="font-medium text-foreground">
                    {data.performance.listingsLast30d}
                  </span>
                </p>
              </div>
            </section>
          </aside>
        </section>
      </main>

      <SiteFooter showFollow showVerificationLink={false} />
    </div>
  );
}
