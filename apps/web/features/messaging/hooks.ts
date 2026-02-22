"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Conversation, ConversationMessage } from "./types";

const ACTIVE_INTERVAL_MS = 12000;

function shouldPoll() {
  if (typeof document === "undefined") return ACTIVE_INTERVAL_MS;
  return document.visibilityState === "visible" ? ACTIVE_INTERVAL_MS : false;
}

async function getJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    const payload = await response.text();
    throw new Error(payload || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export function useConversations(filters: {
  type?: "all" | "listing" | "general";
  status?: "all" | "requests";
  q?: string;
}) {
  const search = new URLSearchParams();
  if (filters.type && filters.type !== "all") search.set("type", filters.type);
  if (filters.status && filters.status !== "all")
    search.set("status", filters.status);
  if (filters.q?.trim()) search.set("q", filters.q.trim());

  return useQuery({
    queryKey: ["messages", "conversations", filters],
    queryFn: () =>
      getJson<Conversation[]>(
        `/api/messages/conversations${search.size ? `?${search.toString()}` : ""}`,
      ),
    refetchInterval: shouldPoll,
  });
}

export function useConversation(conversationId?: string | null) {
  return useQuery({
    queryKey: ["messages", "conversation", conversationId],
    queryFn: () =>
      getJson<Conversation>(`/api/messages/conversations/${conversationId}`),
    enabled: Boolean(conversationId),
    refetchInterval: shouldPoll,
  });
}

export function useMessages(conversationId?: string | null) {
  return useQuery({
    queryKey: ["messages", "thread", conversationId],
    queryFn: () =>
      getJson<ConversationMessage[]>(
        `/api/messages/conversations/${conversationId}/messages`,
      ),
    enabled: Boolean(conversationId),
    refetchInterval: shouldPoll,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { conversationId: string; body: string }) =>
      getJson<ConversationMessage>("/api/messages/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: (message) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", "conversations"],
      });
      queryClient.invalidateQueries({
        queryKey: ["messages", "thread", message.conversationId],
      });
      queryClient.invalidateQueries({
        queryKey: ["messages", "conversation", message.conversationId],
      });
    },
  });
}

export function useAcceptRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      getJson(`/api/messages/requests/${id}/accept`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["messages", "conversations"],
      });
    },
  });
}

export function useDeclineRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      getJson(`/api/messages/requests/${id}/decline`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["messages", "conversations"],
      });
    },
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      listingId?: string;
      recipientId?: string;
      companyId?: string;
    }) =>
      getJson<Conversation>("/api/messages/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", "conversations"],
      });
      queryClient.setQueryData(
        ["messages", "conversation", conversation.id],
        conversation,
      );
    },
  });
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) =>
      getJson(`/api/messages/conversations/${conversationId}/read`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["messages", "conversations"],
      });
    },
  });
}
