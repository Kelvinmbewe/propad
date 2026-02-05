import { useQuery } from "@tanstack/react-query";

export function useFeaturedListings(params?: {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  limit?: number;
  minTrust?: number;
}) {
  return useQuery({
    queryKey: ["home-featured", params],
    queryFn: async () => {
      const search = new URLSearchParams();
      if (params?.lat !== undefined) search.set("lat", params.lat.toFixed(6));
      if (params?.lng !== undefined) search.set("lng", params.lng.toFixed(6));
      if (params?.radiusKm) search.set("radiusKm", String(params.radiusKm));
      if (params?.limit) search.set("limit", String(params.limit));
      if (params?.minTrust) search.set("minTrust", String(params.minTrust));
      const response = await fetch(
        `/api/home/listings/featured?${search.toString()}`,
      );
      if (!response.ok) throw new Error("Failed to load featured");
      return response.json();
    },
    staleTime: 1000 * 60 * 3,
  });
}
