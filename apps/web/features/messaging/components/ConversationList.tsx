"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthenticatedSDK } from "@/hooks/use-authenticated-sdk";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { cn, Avatar, AvatarFallback, AvatarImage } from "@propad/ui";
import { useSession } from "next-auth/react";

export function ConversationList() {
  const pathname = usePathname();
  const sdk = useAuthenticatedSDK();
  const { data: session } = useSession();
  const { data: conversations, isLoading } = useQuery<any[]>({
    queryKey: ["conversations"],
    queryFn: () => sdk!.messaging.conversations.list(),
  });

  if (isLoading)
    return (
      <div className="p-4 text-center text-muted-foreground">Loading...</div>
    );

  if (!conversations?.length) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No conversations yet
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 overflow-y-auto">
      {conversations.map((conv: any) => {
        const isActive = pathname === `/dashboard/messages/${conv.id}`;
        const myId = session?.user?.id;
        const participants = conv.participants ?? [];
        const other = participants.find((participant: any) => {
          const id = participant.user?.id ?? participant.userId;
          return id && id !== myId;
        });
        const isListingChat = Boolean(conv.propertyId || conv.property?.id);
        const title = isListingChat
          ? conv.property?.title || "Listing conversation"
          : other?.user?.name || "General conversation";
        const lastMessage = conv.messages?.[0];
        const avatarSrc = (
          isListingChat
            ? conv.property?.media?.[0]?.url
            : other?.user?.profilePhoto
        ) as string | undefined;

        return (
          <Link
            key={conv.id}
            href={`/dashboard/messages/${conv.id}`}
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors",
              isActive && "bg-muted",
            )}
          >
            <Avatar className="h-10 w-10 border">
              <AvatarImage src={avatarSrc} className="object-cover" />
              <AvatarFallback>
                {isListingChat ? "L" : other?.user?.name?.[0] || "G"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <div className="flex justify-between items-baseline">
                <span className="font-medium truncate">{title}</span>
                {lastMessage && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                    {formatDistanceToNow(new Date(lastMessage.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {lastMessage ? lastMessage.body : "No messages yet"}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {isListingChat ? "Listing chat" : "General chat"}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
