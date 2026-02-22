"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  ScrollArea,
  Skeleton,
} from "@propad/ui";
import { Send } from "lucide-react";
import { getImageUrl } from "@/lib/image-url";

type Conversation = {
  id: string;
  type: "LISTING_CHAT" | "GENERAL_CHAT";
  lastMessageAt?: string | null;
  unreadCount?: number;
  participants: Array<{
    userId: string;
    user?: {
      id: string;
      name?: string | null;
      email?: string | null;
      profilePhoto?: string | null;
      trustScore?: number | null;
    };
  }>;
  property?: { id?: string; title?: string | null } | null;
  messages?: Array<{ body?: string; createdAt?: string }>;
};

type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export function ListingChatsTabV1({ propertyId }: { propertyId: string }) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [body, setBody] = useState("");

  const listQuery = useQuery<{ items: Conversation[] }>({
    queryKey: ["listing-management", "chats", propertyId],
    queryFn: async () => {
      const response = await fetch(
        `/api/messages/listing?propertyId=${encodeURIComponent(propertyId)}`,
      );
      if (!response.ok) return { items: [] };
      return response.json();
    },
    refetchInterval: 12000,
    initialData: { items: [] },
  });

  const conversations = useMemo(
    () =>
      (listQuery.data?.items ?? []).slice().sort((left, right) => {
        const leftAt = left.lastMessageAt
          ? new Date(left.lastMessageAt).getTime()
          : 0;
        const rightAt = right.lastMessageAt
          ? new Date(right.lastMessageAt).getTime()
          : 0;
        return rightAt - leftAt;
      }),
    [listQuery.data?.items],
  );

  const selectedId = selectedConversationId ?? conversations[0]?.id ?? null;

  const messagesQuery = useQuery<Message[]>({
    queryKey: ["listing-management", "chat-thread", selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      const response = await fetch(
        `/api/messages/conversations/${selectedId}/messages`,
      );
      if (!response.ok) return [];
      return response.json();
    },
    enabled: Boolean(selectedId),
    refetchInterval: 8000,
    initialData: [],
  });

  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!selectedId) throw new Error("No conversation selected");
      const response = await fetch(`/api/messages/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selectedId, body: text }),
      });
      if (!response.ok) {
        const raw = await response.text();
        throw new Error(raw || "Failed to send message");
      }
      return response.json();
    },
    onMutate: async (text) => {
      if (!selectedId || !session?.user?.id) return;
      const optimistic: Message = {
        id: `optimistic-${Date.now()}`,
        conversationId: selectedId,
        senderId: session.user.id,
        body: text,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData<Message[]>(
        ["listing-management", "chat-thread", selectedId],
        (current = []) => [...current, optimistic],
      );
      setBody("");
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["listing-management", "chats", propertyId],
      });
      queryClient.invalidateQueries({
        queryKey: ["listing-management", "chat-thread", selectedId],
      });
    },
  });

  const selectedConversation = conversations.find(
    (conversation) => conversation.id === selectedId,
  );

  const markRead = useMutation({
    mutationFn: async (conversationId: string) => {
      await fetch(`/api/messages/conversations/${conversationId}/read`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["listing-management", "chats", propertyId],
      });
    },
  });

  if (listQuery.isLoading) {
    return <Skeleton className="h-96" />;
  }

  if (!conversations.length) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        No listing chats yet.
      </div>
    );
  }

  return (
    <div className="grid min-h-[620px] gap-4 md:grid-cols-[340px_1fr]">
      <Card className="overflow-hidden">
        <CardContent className="h-full p-0">
          <ScrollArea className="h-[620px]">
            <div className="space-y-1 p-2">
              {conversations.map((conversation) => {
                const other = (conversation.participants ?? []).find(
                  (participant) => participant.userId !== session?.user?.id,
                );
                const displayName =
                  other?.user?.name ||
                  other?.user?.email ||
                  "Unnamed participant";
                const snippet =
                  conversation.messages?.[0]?.body || "No messages yet";

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => {
                      setSelectedConversationId(conversation.id);
                      markRead.mutate(conversation.id);
                    }}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      selectedId === conversation.id
                        ? "border-emerald-300 bg-emerald-50/70"
                        : "border-transparent hover:border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Avatar className="h-9 w-9 border">
                        <AvatarImage
                          src={getImageUrl(other?.user?.profilePhoto)}
                        />
                        <AvatarFallback>
                          {displayName.slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold">
                            {displayName}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {conversation.lastMessageAt
                              ? new Date(
                                  conversation.lastMessageAt,
                                ).toLocaleString()
                              : "-"}
                          </p>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {snippet}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge variant="outline">LISTING CHAT</Badge>
                          {conversation.unreadCount ? (
                            <Badge>{conversation.unreadCount}</Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardContent className="flex h-full flex-col p-0">
          <div className="border-b p-4">
            <p className="text-sm font-semibold text-foreground">
              {(selectedConversation?.participants ?? [])
                .filter(
                  (participant) => participant.userId !== session?.user?.id,
                )
                .map(
                  (participant) =>
                    participant.user?.name || participant.user?.email,
                )
                .filter(Boolean)
                .join(", ") || "Conversation"}
            </p>
            <p className="text-xs text-muted-foreground">
              Trust{" "}
              {(selectedConversation?.participants ?? []).find(
                (participant) => participant.userId !== session?.user?.id,
              )?.user?.trustScore ?? 0}
            </p>
          </div>

          <ScrollArea className="h-[500px] px-4 py-4">
            <div className="space-y-3">
              {(messagesQuery.data ?? []).map((message) => {
                const isMine = message.senderId === session?.user?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
                        isMine ? "bg-emerald-600 text-white" : "bg-muted"
                      }`}
                    >
                      <p>{message.body}</p>
                      <p
                        className={`mt-1 text-[10px] ${isMine ? "text-emerald-100" : "text-muted-foreground"}`}
                      >
                        {new Date(message.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="border-t p-3">
            <div className="flex items-end gap-2">
              <Input
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Type your message"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    if (body.trim()) sendMutation.mutate(body.trim());
                  }
                }}
              />
              <Button
                size="icon"
                aria-label="Send message"
                disabled={!body.trim() || sendMutation.isPending}
                onClick={() => sendMutation.mutate(body.trim())}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
