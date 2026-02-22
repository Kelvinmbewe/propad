import { Metadata } from "next";
import { getServerApiBaseUrl } from "@propad/config";
import { AdSlot } from "@/components/ad-slot";
import { LandingNav } from "@/components/landing-nav";
import { ListingsPageClient } from "@/components/listings/listings-page-client";
import { SiteFooter } from "@/components/site-footer";
import { resolveBrowsingLocation } from "@/app/api/home/_utils";
import {
  buildListingsSearchApiParams,
  normalizePropertySearchResult,
  parseListingsQuery,
} from "@/lib/listings";

export const metadata: Metadata = {
  title: "Browse Listings | PropAd",
  description:
    "Discover verified residential and commercial properties across Zimbabwe on PropAd.",
};

type ListingsSearchParams = Record<string, string>;

function normalizeSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): ListingsSearchParams {
  const normalized: ListingsSearchParams = {};
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      const lastValue = value[value.length - 1];
      if (lastValue) normalized[key] = lastValue.trim();
    } else if (typeof value === "string" && value.trim() !== "") {
      normalized[key] = value.trim();
    }
  }
  return normalized;
}

async function fetchProperties(params: ListingsSearchParams) {
  const query = parseListingsQuery(params);

  const location = await resolveBrowsingLocation({
    lat: query.lat,
    lng: query.lng,
    locationId: query.locationId,
    locationLevel: query.locationLevel,
    q: query.q,
    fallbackCity: "Harare",
  });

  const apiParams = buildListingsSearchApiParams(query, {
    lat: location.centerLat,
    lng: location.centerLng,
  });

  const apiBaseUrl = getServerApiBaseUrl();
  if (!apiBaseUrl) {
    return {
      initialPage: normalizePropertySearchResult(null, {
        page: query.page,
        perPage: query.limit,
      }),
      initialQuery: query,
    };
  }

  try {
    const response = await fetch(
      `${apiBaseUrl}/properties/search?${apiParams.toString()}`,
      {
        next: { revalidate: 60 },
      },
    );
    if (!response.ok) {
      throw new Error(`Listings fetch failed: ${response.status}`);
    }
    const payload = (await response.json()) as unknown;
    return {
      initialPage: normalizePropertySearchResult(payload, {
        page: query.page,
        perPage: query.limit,
      }),
      initialQuery: query,
    };
  } catch {
    return {
      initialPage: normalizePropertySearchResult(null, {
        page: query.page,
        perPage: query.limit,
      }),
      initialQuery: query,
    };
  }
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const normalizedParams = normalizeSearchParams(searchParams);
  const { initialPage, initialQuery } = await fetchProperties(normalizedParams);

  return (
    <div className="relative">
      <LandingNav />
      <ListingsPageClient
        initialPage={initialPage}
        initialQuery={initialQuery}
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
              href: "/auth-required?returnTo=%2Fdashboard%2Fverifications",
              tone: "slate",
            },
          ]}
        />
      </section>

      <SiteFooter showFollow showVerificationLink />
    </div>
  );
}
