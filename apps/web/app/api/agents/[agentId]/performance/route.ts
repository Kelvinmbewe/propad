import { NextResponse } from "next/server";
import { serverPublicApiRequest } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: { agentId: string } },
) {
  try {
    const upstream = await serverPublicApiRequest<any>(
      `/users/${context.params.agentId}/listings?page=1&pageSize=1&verifiedOnly=false`,
    );
    return NextResponse.json({
      averageSalePrice: upstream?.stats?.avgSalePrice ?? null,
      averageRentPrice: upstream?.stats?.avgRentPrice ?? null,
      listingsLast30d: upstream?.stats?.listingsLast30DaysCount ?? 0,
      activeListings: upstream?.stats?.activeListingsCount ?? 0,
      verifiedListings: upstream?.stats?.verifiedListingsCount ?? 0,
    });
  } catch {
    return NextResponse.json({
      averageSalePrice: null,
      averageRentPrice: null,
      listingsLast30d: 0,
      activeListings: 0,
      verifiedListings: 0,
    });
  }
}
