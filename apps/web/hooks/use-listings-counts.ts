import { useQuery } from "@tanstack/react-query";

interface UseListingsCountsArgs {
  lat?: number;
  lng?: number;
  q?: string;
  locationId?: string;
  locationLevel?: string;
  intent: "FOR_SALE" | "TO_RENT";
}

export function useListingsCounts(args: UseListingsCountsArgs) {
  return useQuery({
    queryKey: ["listings-counts", args],
    queryFn: async () => {
      const search = new URLSearchParams();
      if (typeof args.lat === "number") search.set("lat", args.lat.toFixed(6));
      if (typeof args.lng === "number") search.set("lng", args.lng.toFixed(6));
      if (args.q) search.set("q", args.q);
      if (args.locationId) search.set("locationId", args.locationId);
      if (args.locationLevel) search.set("locationLevel", args.locationLevel);
      search.set("mode", args.intent === "TO_RENT" ? "rent" : "sale");
      const response = await fetch(`/api/home/counts?${search.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to load listing counts");
      }
      return (await response.json()) as {
        verifiedListingsCount: number;
        newListings30dCount: number;
        medianAskingPrice: number | null;
      };
    },
    staleTime: 60_000,
  });
}
