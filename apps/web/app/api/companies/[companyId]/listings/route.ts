import { NextResponse } from "next/server";
import { serverPublicApiRequest } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: { companyId: string } },
) {
  const url = new URL(request.url);
  const intent = url.searchParams.get("intent") ?? "ALL";
  const verifiedOnly = url.searchParams.get("verifiedOnly") !== "false";
  const sort = url.searchParams.get("sort") ?? "TRUST";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const pageSize = Math.min(
    24,
    Math.max(6, Number(url.searchParams.get("pageSize") ?? 12)),
  );

  const query = new URLSearchParams();
  if (intent === "FOR_SALE" || intent === "TO_RENT") {
    query.set("intent", intent);
  }
  query.set("verifiedOnly", verifiedOnly ? "true" : "false");
  query.set(
    "sort",
    sort === "PRICE_ASC" || sort === "PRICE_DESC" || sort === "NEWEST"
      ? sort
      : "TRUST",
  );
  query.set("page", String(page));
  query.set("pageSize", String(pageSize));

  try {
    const payload = await serverPublicApiRequest<any>(
      `/companies/${context.params.companyId}/listings?${query.toString()}`,
    );
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({
      items: [],
      meta: { page, pageSize, total: 0, totalPages: 0 },
      stats: {
        activeListingsCount: 0,
        verifiedListingsCount: 0,
        listingsLast30DaysCount: 0,
        avgSalePrice: null,
        avgRentPrice: null,
      },
    });
  }
}
