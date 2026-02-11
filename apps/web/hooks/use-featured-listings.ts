import { useQuery } from "@tanstack/react-query";

export function useFeaturedListings(params?: {
  lat?: number;
  lng?: number;
  q?: string;
  limit?: number;
  mode?: "sale" | "rent" | "all";
  verifiedOnly?: boolean;
  primaryRadiusKm?: number;
  maxRadiusKm?: number;
  minResults?: number;
  locationId?: string | null;
  locationLevel?: string | null;
}) {
  return useQuery({
    queryKey: ["home-featured", params],
    queryFn: async () => {
      const search = new URLSearchParams();
      if (params?.lat !== undefined) search.set("lat", params.lat.toFixed(6));
      if (params?.lng !== undefined) search.set("lng", params.lng.toFixed(6));
      if (params?.q) search.set("q", params.q);
      if (params?.limit) search.set("limit", String(params.limit));
      if (params?.mode) search.set("mode", params.mode);
      if (params?.verifiedOnly !== undefined) {
        search.set("verifiedOnly", params.verifiedOnly ? "true" : "false");
      }
      if (params?.primaryRadiusKm) {
        search.set("primaryRadiusKm", String(params.primaryRadiusKm));
      }
      if (params?.maxRadiusKm) {
        search.set("maxRadiusKm", String(params.maxRadiusKm));
      }
      if (params?.minResults) {
        search.set("minResults", String(params.minResults));
      }
      if (params?.locationId) search.set("locationId", params.locationId);
      if (params?.locationLevel)
        search.set("locationLevel", params.locationLevel);
      const response = await fetch(
        `/api/home/listings/featured?${search.toString()}`,
      );
      if (!response.ok) throw new Error("Failed to load featured");
      return response.json();
    },
    staleTime: 1000 * 60 * 3,
  });
}
