"use client";

import { useMemo, useState } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Dialog,
  DialogContent,
  Input,
  notify,
  ScrollArea,
} from "@propad/ui";
import { formatDistanceToNow } from "date-fns";
import { useSession } from "next-auth/react";
import { Send } from "lucide-react";
import { TrustBadge } from "@/components/trust/TrustBadge";
import {
  useConversation,
  useCreateConversation,
  useMessages,
  useSendMessage,
} from "../hooks";

interface DrawerPayload {
  conversationId?: string;
  listingId?: string;
  recipientId?: string;
  companyId?: string;
}

export function MessagingDrawer({
  open,
  onOpenChange,
  payload,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  payload: DrawerPayload;
}) {
  const { data: session } = useSession();
  const [body, setBody] = useState("");
  const createConversation = useCreateConversation();
  const sendMessage = useSendMessage();

  const [conversationId, setConversationId] = useState<string | null>(
    payload.conversationId ?? null,
  );

  const { data: conversation } = useConversation(conversationId);
  const { data: messages } = useMessages(conversationId);

  const otherParticipant = useMemo(() => {
    const myId = session?.user?.id;
    return (conversation?.participants ?? []).find(
      (participant) => participant.userId !== myId,
    );
  }, [conversation?.participants, session?.user?.id]);

  const ensureConversation = async () => {
    if (conversationId) return conversationId;
    const created = await createConversation.mutateAsync({
      listingId: payload.listingId,
      recipientId: payload.recipientId,
      companyId: payload.companyId,
    });
    setConversationId(created.id);
    return created.id;
  };

  const handleSend = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;

    try {
      const activeConversationId = await ensureConversation();
      await sendMessage.mutateAsync({
        conversationId: activeConversationId,
        body: trimmed,
      });
      setBody("");
    } catch (error) {
      notify.error(
        error instanceof Error && error.message
          ? error.message
          : "Unable to send message right now",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="right-0 left-auto top-0 h-screen max-w-2xl w-full translate-x-0 translate-y-0 rounded-none p-0 sm:max-w-xl">
        <div className="flex h-full flex-col">
          <div className="border-b px-5 py-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border">
                <AvatarImage
                  src={otherParticipant?.user?.profilePhoto ?? undefined}
                />
                <AvatarFallback>
                  {otherParticipant?.user?.name?.slice(0, 1) ?? "M"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {otherParticipant?.user?.name ?? "Start conversation"}
                </p>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {conversation?.type === "LISTING_CHAT"
                    ? "Listing chat"
                    : "General chat"}
                </p>
              </div>
            </div>
            {otherParticipant?.user?.trustScore ? (
              <div className="mt-3">
                <TrustBadge
                  trustScore={otherParticipant.user.trustScore}
                  size="sm"
                  showBreakdown={false}
                />
              </div>
            ) : null}
            {conversation?.property ? (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
                <Badge variant="secondary">Listing</Badge>
                <span className="max-w-[220px] truncate">
                  {conversation.property.title}
                </span>
              </div>
            ) : null}
          </div>

          <ScrollArea className="flex-1 px-5 py-4">
            <div className="space-y-3">
              {(messages ?? []).length ? (
                messages?.map((message) => {
                  const isMe = message.senderId === session?.user?.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm ${
                          isMe
                            ? "bg-emerald-600 text-white"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        <p>{message.body}</p>
                        <p
                          className={`mt-1 text-[10px] ${
                            isMe ? "text-emerald-100" : "text-muted-foreground"
                          }`}
                        >
                          {formatDistanceToNow(new Date(message.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No messages yet. Start the conversation below.
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="border-t p-4">
            <div className="flex items-end gap-2">
              <Input
                value={body}
                onChange={(event) => setBody(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder="Type a message"
              />
              <Button
                type="button"
                size="icon"
                onClick={() => void handleSend()}
                disabled={sendMessage.isPending || createConversation.isPending}
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
