import { useQuery } from "@tanstack/react-query";

export function useHomeCounts(params?: {
  lat?: number;
  lng?: number;
  radiusKm?: number;
}) {
  return useQuery({
    queryKey: ["home-counts", params?.lat, params?.lng, params?.radiusKm],
    queryFn: async () => {
      const search = new URLSearchParams();
      if (params?.lat !== undefined) search.set("lat", params.lat.toFixed(6));
      if (params?.lng !== undefined) search.set("lng", params.lng.toFixed(6));
      if (params?.radiusKm) search.set("radiusKm", String(params.radiusKm));
      const response = await fetch(`/api/home/counts?${search.toString()}`);
      if (!response.ok) throw new Error("Failed to load counts");
      return response.json();
    },
    staleTime: 1000 * 60,
  });
}
