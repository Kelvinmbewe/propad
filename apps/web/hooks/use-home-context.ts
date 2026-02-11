import { useQuery } from "@tanstack/react-query";

export function useHomeContext(params?: {
  lat?: number;
  lng?: number;
  q?: string;
  locationId?: string | null;
  locationLevel?: string | null;
}) {
  return useQuery({
    queryKey: [
      "home-context",
      params?.lat,
      params?.lng,
      params?.q,
      params?.locationId,
      params?.locationLevel,
    ],
    queryFn: async () => {
      const search = new URLSearchParams();
      if (params?.lat !== undefined) search.set("lat", params.lat.toFixed(6));
      if (params?.lng !== undefined) search.set("lng", params.lng.toFixed(6));
      if (params?.q) search.set("q", params.q);
      if (params?.locationId) search.set("locationId", params.locationId);
      if (params?.locationLevel)
        search.set("locationLevel", params.locationLevel);
      const response = await fetch(`/api/home/context?${search.toString()}`);
      if (!response.ok) throw new Error("Failed to resolve home context");
      return response.json();
    },
    staleTime: 1000 * 60,
  });
}
