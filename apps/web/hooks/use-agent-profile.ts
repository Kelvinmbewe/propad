"use client";

import { useQuery } from "@tanstack/react-query";

export function useAgentSummary(agentId: string, initialData?: any) {
  return useQuery({
    queryKey: ["agent-summary", agentId],
    queryFn: async () => {
      const response = await fetch(`/api/profiles/agents/${agentId}/summary`);
      if (!response.ok) throw new Error("Failed to load agent summary");
      return response.json();
    },
    initialData,
    staleTime: 60_000,
  });
}

export function useAgentListings(
  agentId: string,
  params: {
    intent: string;
    verifiedOnly: boolean;
    sort: string;
    scope: string;
  },
  initialData?: any,
) {
  return useQuery({
    queryKey: ["agent-listings", agentId, params],
    queryFn: async () => {
      const query = new URLSearchParams();
      query.set("intent", params.intent);
      query.set("verifiedOnly", params.verifiedOnly ? "true" : "false");
      query.set("sort", params.sort);
      query.set("scope", params.scope);
      const response = await fetch(
        `/api/profiles/agents/${agentId}/listings?${query.toString()}`,
      );
      if (!response.ok) throw new Error("Failed to load listings");
      return response.json();
    },
    initialData,
    staleTime: 60_000,
  });
}

export function useAgentPerformance(agentId: string, initialData?: any) {
  return useQuery({
    queryKey: ["agent-performance", agentId],
    queryFn: async () => {
      const response = await fetch(
        `/api/profiles/agents/${agentId}/performance`,
      );
      if (!response.ok) throw new Error("Failed to load performance");
      return response.json();
    },
    initialData,
    staleTime: 120_000,
  });
}

export function useNearbyAgents(
  agentId: string,
  mode: "sale" | "rent",
  initialData?: any,
) {
  return useQuery({
    queryKey: ["agent-nearby", agentId, mode],
    queryFn: async () => {
      const response = await fetch(
        `/api/profiles/agents/${agentId}/nearby?mode=${mode}`,
      );
      if (!response.ok) throw new Error("Failed to load nearby");
      return response.json();
    },
    initialData,
    staleTime: 300_000,
  });
}
