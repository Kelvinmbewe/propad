import { NextResponse } from "next/server";
import { fetchListingDetails, getAgentSummary } from "@/app/api/agents/_lib";
import { serverPublicApiRequest } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: { agentId: string } },
) {
  const summary = await getAgentSummary(context.params.agentId);
  if (!summary) {
    return NextResponse.json({
      items: [],
      meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 },
    });
  }

  const url = new URL(request.url);
  const intent = url.searchParams.get("intent") ?? "ALL";
  const verifiedOnly = url.searchParams.get("verifiedOnly") !== "false";
  const scope = url.searchParams.get("scope") === "AGENCY" ? "AGENCY" : "AGENT";
  const sort = url.searchParams.get("sort") ?? "TRUST";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const pageSize = Math.min(
    24,
    Math.max(6, Number(url.searchParams.get("pageSize") ?? 12)),
  );

  if (scope === "AGENT") {
    try {
      const upstreamQuery = new URLSearchParams();
      if (intent === "FOR_SALE" || intent === "TO_RENT") {
        upstreamQuery.set("intent", intent);
      }
      upstreamQuery.set("verifiedOnly", verifiedOnly ? "true" : "false");
      upstreamQuery.set("sort", sort === "PRICE" ? "PRICE_DESC" : sort);
      upstreamQuery.set("page", String(page));
      upstreamQuery.set("pageSize", String(pageSize));
      const upstream = await serverPublicApiRequest<any>(
        `/users/${context.params.agentId}/listings?${upstreamQuery.toString()}`,
      );
      return NextResponse.json(upstream);
    } catch {
      // fallback below
    }
  }

  const sourceIds = new Set<string>(
    (summary.listings ?? []).map((item) => item.id),
  );
  if (scope === "AGENCY" && summary.affiliation?.agencyId) {
    try {
      const upstreamQuery = new URLSearchParams();
      if (intent === "FOR_SALE" || intent === "TO_RENT") {
        upstreamQuery.set("intent", intent);
      }
      upstreamQuery.set("verifiedOnly", verifiedOnly ? "true" : "false");
      upstreamQuery.set("sort", sort === "PRICE" ? "PRICE_DESC" : sort);
      upstreamQuery.set("page", String(page));
      upstreamQuery.set("pageSize", String(pageSize));
      const upstreamAgency = await serverPublicApiRequest<any>(
        `/companies/${summary.affiliation.agencyId}/listings?${upstreamQuery.toString()}`,
      );
      return NextResponse.json(upstreamAgency);
    } catch {
      try {
        const agency = await serverPublicApiRequest<any>(
          `/companies/${summary.affiliation.agencyId}`,
        );
        for (const item of agency?.listings ?? []) {
          if (item?.id) sourceIds.add(item.id);
        }
      } catch {
        // keep source ids from summary
      }
    }
  }

  const details = await fetchListingDetails(Array.from(sourceIds));
  let items = details.map((item) => ({
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
  }));

  if (intent === "FOR_SALE" || intent === "TO_RENT")
    items = items.filter((item) => item.listingIntent === intent);
  if (verifiedOnly)
    items = items.filter((item) =>
      ["VERIFIED", "TRUSTED"].includes(String(item.verificationLevel)),
    );
  items.sort((a, b) =>
    sort === "NEWEST"
      ? new Date(b.createdAt ?? 0).getTime() -
        new Date(a.createdAt ?? 0).getTime()
      : sort === "PRICE"
        ? b.price - a.price
        : b.trustScore - a.trustScore,
  );

  const start = (page - 1) * pageSize;
  const paged = items.slice(start, start + pageSize);
  return NextResponse.json({
    items: paged,
    meta: {
      page,
      pageSize,
      total: items.length,
      totalPages: Math.ceil(items.length / pageSize),
    },
    stats: {
      activeListingsCount: items.length,
      verifiedListingsCount: items.filter((item) =>
        ["VERIFIED", "TRUSTED"].includes(String(item.verificationLevel)),
      ).length,
      listingsLast30DaysCount: items.filter(
        (item) =>
          Date.now() - new Date(item.createdAt ?? 0).getTime() <=
          30 * 24 * 60 * 60 * 1000,
      ).length,
      avgSalePrice: null,
      avgRentPrice: null,
    },
  });
}
