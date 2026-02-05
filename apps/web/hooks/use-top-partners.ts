import { useQuery } from "@tanstack/react-query";

export function useTopPartners(params: {
  lat?: number;
  lng?: number;
  type: "agents" | "agencies";
  limit?: number;
}) {
  return useQuery({
    queryKey: ["home-partners", params],
    queryFn: async () => {
      const search = new URLSearchParams();
      if (params.lat !== undefined) search.set("lat", params.lat.toFixed(6));
      if (params.lng !== undefined) search.set("lng", params.lng.toFixed(6));
      search.set("type", params.type);
      if (params.limit) search.set("limit", String(params.limit));
      const response = await fetch(`/api/home/partners?${search.toString()}`);
      if (!response.ok) throw new Error("Failed to load partners");
      return response.json();
    },
    staleTime: 1000 * 60 * 2,
  });
}
