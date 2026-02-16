import { NextResponse } from "next/server";
import {
  fetchListingDetails,
  getAgentSummary,
} from "@/app/api/profiles/agents/[id]/_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: { id: string } },
) {
  const summary = await getAgentSummary(context.params.id);
  if (!summary) {
    return NextResponse.json({
      averageSalePrice: null,
      averageRentPrice: null,
      listingsLast30d: 0,
      activeListings: 0,
      verifiedListings: 0,
    });
  }

  const details = await fetchListingDetails(
    (summary.listings ?? []).map((item) => item.id),
  );
  const activeListings = details.length;
  const verifiedListings = details.filter((item) =>
    ["VERIFIED", "TRUSTED"].includes(String(item.verificationLevel)),
  ).length;
  const salePrices = details
    .filter((item) => item.listingIntent !== "TO_RENT")
    .map((item) => Number(item.price ?? 0))
    .filter((price) => Number.isFinite(price) && price > 0);
  const rentPrices = details
    .filter((item) => item.listingIntent === "TO_RENT")
    .map((item) => Number(item.price ?? 0))
    .filter((price) => Number.isFinite(price) && price > 0);
  const now = Date.now();
  const listingsLast30d = details.filter((item) => {
    const createdAt = new Date(item.createdAt ?? 0).getTime();
    return (
      Number.isFinite(createdAt) && now - createdAt <= 30 * 24 * 60 * 60 * 1000
    );
  }).length;

  const avg = (items: number[]) =>
    items.length
      ? items.reduce((sum, value) => sum + value, 0) / items.length
      : null;

  return NextResponse.json({
    averageSalePrice: avg(salePrices),
    averageRentPrice: avg(rentPrices),
    listingsLast30d,
    activeListings,
    verifiedListings,
  });
}
