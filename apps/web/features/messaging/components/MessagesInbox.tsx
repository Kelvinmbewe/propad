"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
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
  Tabs,
  TabsList,
  TabsTrigger,
  Dialog,
  DialogContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  notify,
} from "@propad/ui";
import { EllipsisVertical, MessageSquare, Send } from "lucide-react";
import { TrustBadge } from "@/components/trust/TrustBadge";
import {
  useAcceptRequest,
  useConversation,
  useConversations,
  useDeclineRequest,
  useMarkConversationRead,
  useMessages,
  useSendMessage,
} from "../hooks";

type TabValue = "all" | "listing" | "general" | "requests";

export function MessagesInbox({
  initialConversationId,
}: {
  initialConversationId?: string;
}) {
  const { data: session } = useSession();
  const [tab, setTab] = useState<TabValue>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialConversationId ?? null,
  );
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const [body, setBody] = useState("");

  const conversationsQuery = useConversations({
    type: tab === "listing" ? "listing" : tab === "general" ? "general" : "all",
    status: tab === "requests" ? "requests" : "all",
    q: query,
  });
  const conversation = useConversation(selectedId).data;
  const messages = useMessages(selectedId).data ?? [];
  const sendMessage = useSendMessage();
  const acceptRequest = useAcceptRequest();
  const declineRequest = useDeclineRequest();
  const markRead = useMarkConversationRead();

  const conversations = conversationsQuery.data ?? [];

  const selectedConversation = useMemo(() => {
    if (!selectedId) return null;
    return (
      conversations.find(
        (conversationItem) => conversationItem.id === selectedId,
      ) ??
      conversation ??
      null
    );
  }, [conversation, conversations, selectedId]);

  const pendingRequest =
    selectedConversation?.chatRequest?.status === "PENDING";
  const isRecipient =
    selectedConversation?.chatRequest?.recipientId === session?.user?.id;
  const isRequester =
    selectedConversation?.chatRequest?.requesterId === session?.user?.id;
  const canRequesterSendIntroOnly =
    pendingRequest && isRequester && messages.length === 0;
  const canSend =
    !pendingRequest ||
    canRequesterSendIntroOnly ||
    (!isRecipient && !isRequester);

  const onSelectConversation = (conversationId: string) => {
    setSelectedId(conversationId);
    setMobileListOpen(false);
    void markRead.mutateAsync(conversationId);
  };

  const onSend = async () => {
    if (!selectedId || !body.trim() || !canSend) return;
    try {
      await sendMessage.mutateAsync({
        conversationId: selectedId,
        body: body.trim(),
      });
      setBody("");
    } catch (error) {
      const friendlyMessage =
        error instanceof Error &&
        error.message.includes("Chat request is still pending approval")
          ? "Your intro has been sent. Wait for acceptance before sending another message."
          : error instanceof Error && error.message
            ? error.message
            : "Unable to send message right now";
      notify.error(friendlyMessage);
    }
  };

  const listPane = (
    <Card className="h-full overflow-hidden rounded-2xl border">
      <CardContent className="flex h-full flex-col gap-3 p-3">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search conversations"
          aria-label="Search conversations"
        />
        <Tabs value={tab} onValueChange={(value) => setTab(value as TabValue)}>
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="listing">Listing</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="requests">Requests</TabsTrigger>
          </TabsList>
        </Tabs>
        <ScrollArea className="flex-1">
          {conversationsQuery.isLoading ? (
            <div className="space-y-2 p-1">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
              {tab === "requests" ? "No requests" : "No conversations"}
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map((conversationItem) => {
                const other = (conversationItem.participants ?? []).find(
                  (participant) => participant.userId !== session?.user?.id,
                );
                const last = conversationItem.messages?.[0];
                const isActive = selectedId === conversationItem.id;
                const listingTitle = conversationItem.property?.title;

                return (
                  <button
                    key={conversationItem.id}
                    type="button"
                    onClick={() => onSelectConversation(conversationItem.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      isActive
                        ? "border-emerald-300 bg-emerald-50/60"
                        : "border-transparent hover:border-border hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 border">
                        <AvatarImage
                          src={
                            conversationItem.type === "LISTING_CHAT"
                              ? conversationItem.property?.media?.[0]?.url
                              : other?.user?.profilePhoto ?? undefined
                          }
                        />
                        <AvatarFallback>
                          {(other?.user?.name ?? listingTitle ?? "M").slice(
                            0,
                            1,
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {conversationItem.type === "LISTING_CHAT"
                              ? listingTitle || "Listing conversation"
                              : other?.user?.name || "General chat"}
                          </p>
                          {last?.createdAt ? (
                            <span className="text-[11px] text-muted-foreground">
                              {formatDistanceToNow(new Date(last.createdAt), {
                                addSuffix: true,
                              })}
                            </span>
                          ) : null}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {conversationItem.type === "LISTING_CHAT"
                            ? listingTitle || "Listing chat"
                            : "General chat"}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {last?.body || "No messages yet"}
                        </p>
                      </div>
                      {conversationItem.unreadCount ? (
                        <Badge>{conversationItem.unreadCount}</Badge>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Messages
          </h1>
          <p className="text-sm text-muted-foreground">
            Unified inbox for listing and general chats.
          </p>
        </div>
        <Button
          variant="secondary"
          className="md:hidden"
          onClick={() => setMobileListOpen(true)}
        >
          Conversations
        </Button>
      </div>

      <div className="grid min-h-[68vh] gap-4 md:grid-cols-[340px_1fr]">
        <div className="hidden md:block">{listPane}</div>

        <Card className="overflow-hidden rounded-2xl border">
          <CardContent className="flex h-full flex-col p-0">
            {!selectedConversation ? (
              <div className="flex h-full items-center justify-center p-8 text-center text-muted-foreground">
                Select a conversation
              </div>
            ) : (
              <>
                <div className="border-b px-5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {(selectedConversation.participants ?? [])
                          .filter(
                            (participant) =>
                              participant.userId !== session?.user?.id,
                          )
                          .map((participant) => participant.user?.name)
                          .filter(Boolean)
                          .join(", ") || "Conversation"}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">
                          {selectedConversation.type === "LISTING_CHAT"
                            ? "Listing"
                            : "General"}
                        </Badge>
                        {selectedConversation.type === "LISTING_CHAT" &&
                        selectedConversation.property ? (
                          <Badge
                            variant="outline"
                            className="max-w-[260px] truncate"
                          >
                            {selectedConversation.property.title}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Conversation actions"
                        >
                          <EllipsisVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {selectedConversation.property?.id ? (
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/properties/${selectedConversation.property.id}`}
                            >
                              View listing
                            </Link>
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem
                          onClick={() =>
                            void markRead.mutateAsync(selectedConversation.id)
                          }
                        >
                          Mark as read
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {(selectedConversation.participants ?? []).map(
                    (participant) => {
                      if (
                        !participant.user ||
                        participant.userId === session?.user?.id
                      )
                        return null;
                      if (!participant.user.trustScore) return null;
                      return (
                        <div key={participant.id} className="mt-2">
                          <TrustBadge
                            trustScore={participant.user.trustScore}
                            size="sm"
                            showBreakdown={false}
                          />
                        </div>
                      );
                    },
                  )}

                  {selectedConversation.type === "LISTING_CHAT" &&
                  selectedConversation.property ? (
                    <div className="mt-3 rounded-xl border bg-muted/30 p-3 text-sm">
                      <p className="font-medium">
                        {selectedConversation.property.title}
                      </p>
                      <p className="text-muted-foreground">
                        {[
                          selectedConversation.property.suburb?.name,
                          selectedConversation.property.city?.name,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                      <Button
                        asChild
                        variant="ghost"
                        className="h-auto p-0 text-sm"
                      >
                        <Link
                          href={`/properties/${selectedConversation.property.id}`}
                        >
                          View listing
                        </Link>
                      </Button>
                    </div>
                  ) : null}
                </div>

                <ScrollArea className="flex-1 px-4 py-4">
                  <div className="space-y-3">
                    {messages.length === 0 ? (
                      <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                        No messages yet
                      </div>
                    ) : (
                      messages.map((message) => {
                        const isMe = message.senderId === session?.user?.id;
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                                isMe ? "bg-emerald-600 text-white" : "bg-muted"
                              }`}
                            >
                              <p>{message.body}</p>
                              <p
                                className={`mt-1 text-[10px] ${isMe ? "text-emerald-100" : "text-muted-foreground"}`}
                              >
                                {formatDistanceToNow(
                                  new Date(message.createdAt),
                                  {
                                    addSuffix: true,
                                  },
                                )}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>

                <div className="border-t p-4">
                  {pendingRequest && isRequester && messages.length > 0 ? (
                    <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                      Your intro is sent. You can send more once this request is
                      accepted.
                    </div>
                  ) : null}
                  {pendingRequest && isRecipient ? (
                    <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                      <span>This general chat is pending your approval.</span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            selectedConversation.chatRequest &&
                            acceptRequest.mutate(
                              selectedConversation.chatRequest.id,
                            )
                          }
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            selectedConversation.chatRequest &&
                            declineRequest.mutate(
                              selectedConversation.chatRequest.id,
                            )
                          }
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex items-end gap-2">
                    <Input
                      value={body}
                      onChange={(event) => setBody(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void onSend();
                        }
                      }}
                      placeholder="Type your message"
                      disabled={!canSend || sendMessage.isPending}
                    />
                    <Button
                      size="icon"
                      onClick={() => void onSend()}
                      disabled={
                        !canSend || !body.trim() || sendMessage.isPending
                      }
                      aria-label="Send message"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={mobileListOpen} onOpenChange={setMobileListOpen}>
        <DialogContent className="max-w-md p-0">{listPane}</DialogContent>
      </Dialog>
    </div>
  );
}
