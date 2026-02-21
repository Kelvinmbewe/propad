"use client";

import { useQuery } from "@tanstack/react-query";

export function useCompanyListings(
  companyId: string,
  params: {
    intent: "ALL" | "FOR_SALE" | "TO_RENT";
    verifiedOnly: boolean;
    sort: "TRUST" | "NEWEST" | "PRICE_ASC" | "PRICE_DESC";
    page: number;
    pageSize?: number;
  },
  initialData?: any,
) {
  return useQuery({
    queryKey: ["company-listings", companyId, params],
    queryFn: async () => {
      const query = new URLSearchParams();
      query.set("intent", params.intent);
      query.set("verifiedOnly", params.verifiedOnly ? "true" : "false");
      query.set("sort", params.sort);
      query.set("page", String(params.page));
      query.set("pageSize", String(params.pageSize ?? 12));
      const response = await fetch(
        `/api/companies/${companyId}/listings?${query.toString()}`,
      );
      if (!response.ok) throw new Error("Failed to load company listings");
      return response.json();
    },
    initialData,
    staleTime: 60_000,
  });
}
