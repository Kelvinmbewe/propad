import { useQuery } from "@tanstack/react-query";

export function useHomeAreas(params?: {
  lat?: number;
  lng?: number;
  city?: string;
}) {
  return useQuery({
    queryKey: ["home-areas", params],
    queryFn: async () => {
      const search = new URLSearchParams();
      if (params?.lat !== undefined) search.set("lat", params.lat.toFixed(6));
      if (params?.lng !== undefined) search.set("lng", params.lng.toFixed(6));
      if (params?.city) search.set("city", params.city);
      const response = await fetch(`/api/home/areas?${search.toString()}`);
      if (!response.ok) throw new Error("Failed to load areas");
      return response.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}
