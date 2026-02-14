import { useQuery } from "@tanstack/react-query";
import { getRequiredPublicApiBaseUrl } from "@/lib/api-base-url";
import {
  buildListingsSearchApiParams,
  normalizePropertySearchResult,
  type ListingsQueryState,
} from "@/lib/listings";

interface UseListingsPinsArgs {
  query: ListingsQueryState;
  center?: { lat: number; lng: number };
}

export function useListingsPins({ query, center }: UseListingsPinsArgs) {
  return useQuery({
    queryKey: ["listings-pins", query, center?.lat, center?.lng],
    queryFn: async () => {
      const params = buildListingsSearchApiParams(
        {
          ...query,
          page: 1,
          limit: Math.min(120, Math.max(30, query.limit * 3)),
        },
        center,
      );
      const response = await fetch(
        `${getRequiredPublicApiBaseUrl()}/properties/search?${params.toString()}`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        throw new Error("Failed to load listing pins");
      }
      const payload = (await response.json()) as unknown;
      const normalized = normalizePropertySearchResult(payload, {
        page: 1,
        perPage: Math.min(120, Math.max(30, query.limit * 3)),
      });
      return normalized.items;
    },
    staleTime: 60_000,
  });
}
