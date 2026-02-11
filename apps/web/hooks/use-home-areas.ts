import { useQuery } from "@tanstack/react-query";

export function useHomeAreas(params?: {
  lat?: number;
  lng?: number;
  q?: string;
  locationId?: string | null;
  locationLevel?: string | null;
  mode?: "sale" | "rent" | "all";
}) {
  return useQuery({
    queryKey: ["home-areas", params],
    queryFn: async () => {
      const search = new URLSearchParams();
      if (params?.lat !== undefined) search.set("lat", params.lat.toFixed(6));
      if (params?.lng !== undefined) search.set("lng", params.lng.toFixed(6));
      if (params?.q) search.set("q", params.q);
      if (params?.locationId) search.set("locationId", params.locationId);
      if (params?.locationLevel)
        search.set("locationLevel", params.locationLevel);
      if (params?.mode) search.set("mode", params.mode);
      const response = await fetch(`/api/home/areas?${search.toString()}`);
      if (!response.ok) throw new Error("Failed to load areas");
      return response.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}
