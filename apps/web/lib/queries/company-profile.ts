import { serverPublicApiRequest } from "@/lib/server-api";
import { resolveBrowsingLocation } from "@/app/api/home/_utils";
import { getNearbyPartners } from "@/app/api/agents/_lib";

type CompanyResponse = {
  id: string;
  agencyId?: string;
  name: string;
  slug?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  lat?: number | null;
  lng?: number | null;
  website?: string | null;
  categories?: string[];
  createdAt?: string;
  isVerified?: boolean;
  stats?: {
    listingsCount?: number;
    reviewsCount?: number;
    avgRating?: number;
    yearsActive?: number;
  };
  trust?: {
    score?: number;
    tier?: string;
    breakdown?: Record<string, number>;
    explanation?: {
      complaintResolutionRate?: number;
      avgRating?: number;
    };
  };
  socialLinks?: { website?: string } | null;
  reviews?: Array<{
    id: string;
    rating?: number;
    comment?: string;
    author?: string;
    createdAt?: string;
  }>;
  team?: Array<{ id: string; name: string; profilePhoto?: string | null }>;
};

export type CompanyListingItem = {
  id: string;
  title: string;
  price: number;
  currency?: string;
  listingIntent: "FOR_SALE" | "TO_RENT";
  bedrooms?: number | null;
  bathrooms?: number | null;
  areaSqm?: number | null;
  verificationLevel?: string;
  trustScore?: number;
  imageUrl?: string | null;
  locationText?: string;
  createdAt?: string;
  status?: string;
};

export async function getCompanyProfilePageData(companyId: string) {
  const [company, listingsPayload, listingsStatsPayload] = await Promise.all([
    serverPublicApiRequest<CompanyResponse>(`/companies/${companyId}`),
    serverPublicApiRequest<any>(
      `/companies/${companyId}/listings?verifiedOnly=true&sort=TRUST&page=1&pageSize=12`,
    ).catch(() => null),
    serverPublicApiRequest<any>(
      `/companies/${companyId}/listings?verifiedOnly=false&sort=TRUST&page=1&pageSize=1`,
    ).catch(() => null),
  ]);

  const listings = (listingsPayload?.items ?? []) as CompanyListingItem[];

  const stats = listingsStatsPayload?.stats ?? listingsPayload?.stats ?? {};
  const city =
    company.city ?? listings[0]?.locationText?.split(",")?.[1]?.trim();
  const province = company.province;
  const locationQuery = [city, province].filter(Boolean).join(", ");

  const location = await resolveBrowsingLocation({
    lat: typeof company.lat === "number" ? company.lat : undefined,
    lng: typeof company.lng === "number" ? company.lng : undefined,
    q: locationQuery || company.address || company.name,
    fallbackCity: "Harare",
  }).catch(() => null);

  const nearbyRaw = await getNearbyPartners({
    lat: location?.centerLat,
    lng: location?.centerLng,
    q: locationQuery || city || province,
    mode: "sale",
    limit: 8,
  }).catch(() => ({ agents: [], agencies: [] }));

  const nearby = {
    agents: nearbyRaw.agents ?? [],
    agencies: (nearbyRaw.agencies ?? []).filter(
      (agency: any) =>
        agency?.id !== company.agencyId && agency?.id !== company.id,
    ),
  };

  const team = (company.team ?? []).slice(0, 6);
  const teamWithCounts = await Promise.all(
    team.map(async (member) => {
      try {
        const payload = await serverPublicApiRequest<any>(
          `/users/${member.id}/listings?page=1&pageSize=1&verifiedOnly=true`,
        );
        return {
          ...member,
          activeListingsCount: Number(payload?.stats?.activeListingsCount ?? 0),
          trustScore: null,
        };
      } catch {
        return { ...member, activeListingsCount: 0, trustScore: null };
      }
    }),
  );

  return {
    company,
    listings,
    listingsMeta: listingsPayload?.meta ?? {
      page: 1,
      pageSize: 12,
      total: listings.length,
      totalPages: 1,
    },
    stats: {
      activeListingsCount: Number(
        stats?.activeListingsCount ??
          company.stats?.listingsCount ??
          listings.length,
      ),
      verifiedListingsCount: Number(stats?.verifiedListingsCount ?? 0),
      reviewsCount: Number(company.stats?.reviewsCount ?? 0),
      avgRating:
        typeof company.stats?.avgRating === "number"
          ? company.stats.avgRating
          : null,
      teamCount: company.team?.length ?? 0,
    },
    performance: {
      avgSalePrice:
        typeof stats?.avgSalePrice === "number" ? stats.avgSalePrice : null,
      avgRentPrice:
        typeof stats?.avgRentPrice === "number" ? stats.avgRentPrice : null,
      listingsLast30d: Number(stats?.listingsLast30DaysCount ?? 0),
      listingsPerMonth:
        typeof stats?.listingsLast30DaysCount === "number"
          ? stats.listingsLast30DaysCount
          : null,
    },
    location: {
      city: location?.city ?? city ?? "Harare",
      province: location?.province ?? province ?? "",
      lat: location?.centerLat,
      lng: location?.centerLng,
      address: company.address ?? null,
    },
    team: teamWithCounts,
    nearby,
    quickLinks: {
      city: location?.city ?? city ?? "Harare",
      province: location?.province ?? province ?? "",
      lat: location?.centerLat,
      lng: location?.centerLng,
    },
    reviews: company.reviews ?? [],
    trust: {
      score: Number(company.trust?.score ?? 0),
      tier: company.trust?.tier ?? "Standard",
      breakdown: company.trust?.breakdown ?? {},
      complaintResolutionRate:
        company.trust?.explanation?.complaintResolutionRate ?? null,
    },
  };
}
