"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

async function getJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  if (!response.ok) {
    const raw = await response.text();
    throw new Error(raw || `Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

export function useConversationsList(filters?: {
  type?: "listing" | "viewing" | "general" | "all";
  q?: string;
}) {
  const search = new URLSearchParams();
  if (filters?.type && filters.type !== "all") search.set("type", filters.type);
  if (filters?.q?.trim()) search.set("q", filters.q.trim());
  return useQuery({
    queryKey: ["conversations-v2", "list", filters],
    queryFn: () =>
      getJson<any[]>(
        `/api/conversations${search.size ? `?${search.toString()}` : ""}`,
      ),
    refetchInterval: 12000,
  });
}

export function useConversationMessages(conversationId?: string | null) {
  return useQuery({
    queryKey: ["conversations-v2", "messages", conversationId],
    queryFn: () =>
      getJson<any[]>(`/api/conversations/${conversationId}/messages`),
    enabled: Boolean(conversationId),
    refetchInterval: 8000,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { conversationId: string; body: string }) =>
      getJson(`/api/conversations/${payload.conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: payload.body }),
      }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["conversations-v2", "list"],
      });
      queryClient.invalidateQueries({
        queryKey: ["conversations-v2", "messages", variables.conversationId],
      });
    },
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) =>
      getJson(`/api/conversations/${conversationId}/read`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["conversations-v2", "list"],
      });
    },
  });
}

export function useDeal(dealId?: string | null) {
  return useQuery({
    queryKey: ["deals-v2", dealId],
    queryFn: () => getJson(`/api/deals/${dealId}`),
    enabled: Boolean(dealId),
  });
}
