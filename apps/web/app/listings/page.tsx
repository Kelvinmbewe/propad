import { Metadata } from "next";
import { getServerApiBaseUrl } from "@propad/config";
import {
  PropertySearchResultSchema,
  type PropertySearchResult,
} from "@propad/sdk";
import { PropertyFeed } from "@/components/property-feed";

export const metadata: Metadata = {
  title: "Browse Listings | PropAd",
  description:
    "Discover verified residential and commercial properties across Zimbabwe on PropAd.",
};

type ListingsSearchParams = Record<string, string>;

async function fetchProperties(
  params: ListingsSearchParams,
): Promise<PropertySearchResult> {
  try {
    const searchParams = new URLSearchParams(params);

    if (!searchParams.has("limit")) {
      searchParams.set("limit", "18");
    }

    if (!searchParams.has("page")) {
      searchParams.set("page", "1");
    }

    const parsedPage = Number(searchParams.get("page"));
    const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const parsedLimit = Number(searchParams.get("limit"));
    const perPage =
      Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 18;

    const apiBaseUrl = getServerApiBaseUrl();
    if (!apiBaseUrl) {
      throw new Error("API base URL is not configured");
    }

    const response = await fetch(
      `${apiBaseUrl}/properties/search?${searchParams.toString()}`,
      {
        next: { revalidate: 60 },
      },
    );

    if (!response.ok) {
      console.error(`API returned ${response.status}: ${response.statusText}`);
      return {
        items: [],
        page,
        perPage,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        facets: {
          price: { min: 0, max: 0 },
          types: [],
          suburbs: [],
        },
      } satisfies PropertySearchResult;
    }

    const json = await response.json();
    return PropertySearchResultSchema.parse(json);
  } catch (error) {
    console.error("Failed to fetch properties:", error);
    // Return empty result instead of throwing
    const parsedPage = Number(params.page ?? "1");
    const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const parsedLimit = Number(params.limit ?? "18");
    const perPage =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 50)
        : 18;

    return {
      items: [],
      page,
      perPage,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      facets: {
        price: { min: 0, max: 0 },
        types: [],
        suburbs: [],
      },
    } satisfies PropertySearchResult;
  }
}

function normalizeSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): ListingsSearchParams {
  const normalized: ListingsSearchParams = {};

  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      const lastValue = value[value.length - 1];
      if (lastValue) {
        normalized[key] = lastValue.trim();
      }
    } else if (typeof value === "string" && value.trim() !== "") {
      normalized[key] = value.trim();
    }
  }

  return normalized;
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const normalizedParams = normalizeSearchParams(searchParams);
  const pageParam = normalizedParams.page ?? "1";
  const limitParam = normalizedParams.limit ?? "18";
  const parsedPageParam = Number(pageParam);
  const safePage =
    Number.isFinite(parsedPageParam) && parsedPageParam > 0
      ? parsedPageParam
      : 1;
  const parsedLimitParam = Number(limitParam);
  const safeLimit =
    Number.isFinite(parsedLimitParam) && parsedLimitParam > 0
      ? Math.min(parsedLimitParam, 50)
      : 18;

  const initialPage = await fetchProperties({
    ...normalizedParams,
    page: String(safePage),
    limit: String(safeLimit),
  });

  const filters = { ...normalizedParams };
  delete filters.page;
  delete filters.limit;

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12">
      <section className="text-center">
        <h1 className="text-3xl font-semibold md:text-4xl">
          Featured Zimbabwe property listings
        </h1>
        <p className="mt-3 text-neutral-600">
          Verified homes lead the pack, with pending verification listings
          clearly marked and ranked lower until approved.
        </p>
      </section>

      <PropertyFeed initialPage={initialPage} filters={filters} />
    </main>
  );
}
