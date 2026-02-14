import { useMutation } from "@tanstack/react-query";

export interface CreateSavedSearchPayload {
  name: string;
  intent: "FOR_SALE" | "TO_RENT";
  locationLabel: string;
  locationId?: string | null;
  locationLevel?: string | null;
  propertyType?: string;
  priceRange?: string;
  verifiedOnly: boolean;
  minTrust: number;
  queryJson: Record<string, unknown>;
}

export function useCreateSavedSearch() {
  return useMutation({
    mutationFn: async (payload: CreateSavedSearchPayload) => {
      const response = await fetch("/api/home/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("Failed to create saved search");
      }
      return response.json();
    },
  });
}
