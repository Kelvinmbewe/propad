import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { PropertySearchResult } from "@propad/sdk";
import { getRequiredPublicApiBaseUrl } from "@/lib/api-base-url";
import {
  buildListingsSearchApiParams,
  normalizePropertySearchResult,
  type ListingsQueryState,
} from "@/lib/listings";

interface UseListingsSearchArgs {
  query: ListingsQueryState;
  center?: { lat: number; lng: number };
  initialData?: PropertySearchResult;
}

export function useListingsSearch({
  query,
  center,
  initialData,
}: UseListingsSearchArgs) {
  return useQuery({
    queryKey: ["listings-search", query, center?.lat, center?.lng],
    queryFn: async () => {
      const params = buildListingsSearchApiParams(query, center);
      const response = await fetch(
        `${getRequiredPublicApiBaseUrl()}/properties/search?${params.toString()}`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        throw new Error("Failed to load listings");
      }
      const payload = (await response.json()) as unknown;
      return normalizePropertySearchResult(payload, {
        page: query.page,
        perPage: query.limit,
      });
    },
    initialData,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
