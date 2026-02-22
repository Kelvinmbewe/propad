import { useQuery } from "@tanstack/react-query";

interface UsePopularAreasNearArgs {
  lat?: number;
  lng?: number;
  q?: string;
  locationId?: string;
  locationLevel?: string;
  intent: "FOR_SALE" | "TO_RENT";
}

export function usePopularAreasNear(args: UsePopularAreasNearArgs) {
  return useQuery({
    queryKey: ["popular-areas-near", args],
    queryFn: async () => {
      const search = new URLSearchParams();
      if (typeof args.lat === "number") search.set("lat", args.lat.toFixed(6));
      if (typeof args.lng === "number") search.set("lng", args.lng.toFixed(6));
      if (args.q) search.set("q", args.q);
      if (args.locationId) search.set("locationId", args.locationId);
      if (args.locationLevel) search.set("locationLevel", args.locationLevel);
      search.set("mode", args.intent === "TO_RENT" ? "rent" : "sale");
      const response = await fetch(`/api/home/areas?${search.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to load nearby areas");
      }
      return (await response.json()) as {
        topCities: Array<{
          id: string;
          name: string;
          province?: string | null;
          count?: number;
        }>;
        topSuburbs: Array<{
          id: string;
          name: string;
          city?: string | null;
          count?: number;
        }>;
      };
    },
    staleTime: 300_000,
  });
}
