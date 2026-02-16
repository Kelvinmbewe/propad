import { NextResponse } from "next/server";
import {
  fetchListingDetails,
  getAgentSummary,
} from "@/app/api/profiles/agents/[id]/_lib";
import { serverPublicApiRequest } from "@/lib/server-api";

function intentOf(listing: any): "FOR_SALE" | "TO_RENT" {
  return listing?.listingIntent === "TO_RENT" ? "TO_RENT" : "FOR_SALE";
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: { id: string } },
) {
  const summary = await getAgentSummary(context.params.id);
  if (!summary) {
    return NextResponse.json({ items: [] });
  }

  const url = new URL(request.url);
  const intent = url.searchParams.get("intent") ?? "ALL";
  const verifiedOnly = url.searchParams.get("verifiedOnly") !== "false";
  const scope = url.searchParams.get("scope") === "AGENCY" ? "AGENCY" : "AGENT";
  const sort = url.searchParams.get("sort") ?? "TRUST";

  const sourceIds = new Set<string>(
    (summary.listings ?? []).map((item) => item.id),
  );

  if (scope === "AGENCY" && summary.affiliation?.agencyId) {
    try {
      const agency = await serverPublicApiRequest<any>(
        `/companies/${summary.affiliation.agencyId}`,
      );
      for (const item of agency?.listings ?? []) {
        if (item?.id) sourceIds.add(item.id);
      }
    } catch {
      // graceful fallback to agent listings only
    }
  }

  const details = await fetchListingDetails(Array.from(sourceIds));

  let items = details.map((item) => ({
    id: item.id,
    title: item.title,
    price: Number(item.price ?? 0),
    currency: item.currency ?? "USD",
    listingIntent: intentOf(item),
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

  if (intent === "FOR_SALE" || intent === "TO_RENT") {
    items = items.filter((item) => item.listingIntent === intent);
  }

  if (verifiedOnly) {
    items = items.filter((item) => {
      const level = String(item.verificationLevel ?? "");
      return level === "VERIFIED" || level === "TRUSTED";
    });
  }

  items.sort((a, b) => {
    if (sort === "PRICE") return b.price - a.price;
    if (sort === "NEWEST")
      return (
        new Date(b.createdAt ?? 0).getTime() -
        new Date(a.createdAt ?? 0).getTime()
      );
    return b.trustScore - a.trustScore;
  });

  return NextResponse.json({ items });
}
