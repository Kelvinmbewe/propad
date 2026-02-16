import { serverPublicApiRequest } from "@/lib/server-api";
import {
  DEFAULT_RADIUS_KM,
  clampInt,
  fetchApiJson,
  mapModeParam,
  parseNumber,
  resolveBrowsingLocation,
} from "@/app/api/home/_utils";

export type AgentSummaryPayload = {
  id: string;
  name: string;
  role: string;
  profilePhoto?: string | null;
  bio?: string | null;
  location?: string | null;
  joinedAt?: string | null;
  trust?: {
    score?: number;
    tier?: string;
    explanation?: { avgRating?: number };
  };
  affiliation?: {
    agencyId?: string;
    name?: string;
    logoUrl?: string | null;
  } | null;
  listings?: Array<{
    id: string;
    title?: string;
    price?: number;
    currency?: string;
    bedrooms?: number | null;
    bathrooms?: number | null;
    city?: string | null;
    suburb?: string | null;
    imageUrl?: string | null;
  }>;
  reviews?: Array<{
    id: string;
    rating?: number;
    comment?: string;
    author?: string;
    createdAt?: string;
  }>;
};

export async function getAgentSummary(
  id: string,
): Promise<AgentSummaryPayload | null> {
  const candidates = [`/users/${id}`, `/profiles/users/${id}`];
  for (const endpoint of candidates) {
    try {
      const payload = await serverPublicApiRequest<any>(endpoint);
      if (!payload) continue;
      if (endpoint.startsWith("/users/")) {
        return payload as AgentSummaryPayload;
      }
      return {
        id: payload.id,
        name: payload.name,
        role: "AGENT",
        profilePhoto: payload.profilePhoto,
        bio: payload.bio,
        location: payload.location,
        joinedAt: payload?.stats?.joinedAt,
        trust: {
          score: Number(payload?.stats?.reviewCount ?? 0) > 0 ? 70 : 40,
          tier: payload?.stats?.trustTier ?? "Standard",
          explanation: {
            avgRating: 0,
          },
        },
        affiliation: null,
        listings: [],
        reviews: (payload.recentReviews ?? []).map((item: any) => ({
          id: item.id,
          rating: item.rating,
          comment: item.comment,
          author: item.author,
          createdAt: item.date,
        })),
      };
    } catch {
      continue;
    }
  }
  return null;
}

export async function fetchListingDetails(ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  const details = await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        return await serverPublicApiRequest<any>(`/properties/${id}`);
      } catch {
        return null;
      }
    }),
  );
  return details.filter((item): item is any => Boolean(item));
}

export async function getNearbyPartners(params: {
  q?: string | null;
  lat?: number;
  lng?: number;
  mode?: string;
  limit?: number;
}) {
  const location = await resolveBrowsingLocation({
    lat: params.lat,
    lng: params.lng,
    q: params.q,
    locationId: undefined,
    locationLevel: undefined,
    fallbackCity: "Harare",
  });

  const mode = mapModeParam(params.mode ?? "sale");
  const radiusKm = clampInt(undefined, DEFAULT_RADIUS_KM, 1, 500);
  const limit = clampInt(params.limit, 5, 1, 10);

  const query = new URLSearchParams();
  query.set("lat", location.centerLat.toFixed(6));
  query.set("lng", location.centerLng.toFixed(6));
  query.set("radiusKm", String(Math.min(radiusKm, 150)));
  query.set("limit", String(limit));
  query.set("verifiedOnly", "true");
  if (mode === "SALE") query.set("intent", "FOR_SALE");
  if (mode === "RENT") query.set("intent", "TO_RENT");

  const [agents, agencies] = await Promise.all([
    fetchApiJson<any[]>(`/properties/home/top-agents?${query.toString()}`),
    fetchApiJson<any[]>(`/properties/home/top-agencies?${query.toString()}`),
  ]);

  return { agents: agents ?? [], agencies: agencies ?? [] };
}
