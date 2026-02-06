import { useQuery } from "@tanstack/react-query";

export function useNearbyListings(params: {
  lat?: number;
  lng?: number;
  city?: string;
  locationId?: string | null;
  locationLevel?: string | null;
  mode?: "sale" | "rent" | "all";
  verifiedOnly?: boolean;
  limit?: number;
  minTrust?: number;
  propertyType?: string;
  priceMin?: number;
  priceMax?: number;
}) {
  return useQuery({
    queryKey: ["home-nearby", params],
    queryFn: async () => {
      const search = new URLSearchParams();
      if (params.lat !== undefined) search.set("lat", params.lat.toFixed(6));
      if (params.lng !== undefined) search.set("lng", params.lng.toFixed(6));
      if (params.city) search.set("city", params.city);
      if (params.locationId) search.set("locationId", params.locationId);
      if (params.locationLevel)
        search.set("locationLevel", params.locationLevel);
      if (params.mode) search.set("mode", params.mode);
      if (params.verifiedOnly !== undefined)
        search.set("verifiedOnly", params.verifiedOnly ? "true" : "false");
      if (params.limit) search.set("limit", String(params.limit));
      if (params.minTrust) search.set("minTrust", String(params.minTrust));
      if (params.propertyType) search.set("propertyType", params.propertyType);
      if (params.priceMin !== undefined)
        search.set("priceMin", String(params.priceMin));
      if (params.priceMax !== undefined)
        search.set("priceMax", String(params.priceMax));
      const response = await fetch(
        `/api/home/listings/nearby?${search.toString()}`,
      );
      if (!response.ok) throw new Error("Failed to load listings");
      return response.json();
    },
    staleTime: 1000 * 30,
  });
}
