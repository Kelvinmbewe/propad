"use client";

import { useQuery } from "@tanstack/react-query";

export interface NearbyPropertyItem {
  id: string;
  title: string;
  price: number;
  currency: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  areaSqm?: number | null;
  locationText: string;
  imageUrl?: string | null;
  trustScore: number;
  distanceKm: number;
  listingIntent: "FOR_SALE" | "TO_RENT";
}

export function useNearbyProperties(params: {
  currentId: string;
  lat?: number;
  lng?: number;
  intent: "FOR_SALE" | "TO_RENT";
  price?: number;
  radiusKm?: number;
}) {
  return useQuery({
    queryKey: ["nearby-properties", params],
    enabled: typeof params.lat === "number" && typeof params.lng === "number",
    queryFn: async () => {
      const search = new URLSearchParams();
      search.set("currentId", params.currentId);
      search.set("lat", String(params.lat));
      search.set("lng", String(params.lng));
      search.set("intent", params.intent);
      if (typeof params.price === "number")
        search.set("price", String(params.price));
      search.set("radiusKm", String(params.radiusKm ?? 10));
      const response = await fetch(
        `/api/properties/nearby?${search.toString()}`,
      );
      if (!response.ok) {
        throw new Error("Failed to load nearby properties");
      }
      return (await response.json()) as {
        items: NearbyPropertyItem[];
      };
    },
    staleTime: 120_000,
  });
}
