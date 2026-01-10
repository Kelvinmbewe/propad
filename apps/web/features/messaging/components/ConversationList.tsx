
'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { cn, Avatar, AvatarFallback, AvatarImage } from '@propad/ui';

export function ConversationList() {
    const pathname = usePathname();
    const sdk = useAuthenticatedSDK();
    const { data: conversations, isLoading } = useQuery({
        queryKey: ['conversations'],
        queryFn: () => sdk!.messaging.conversations.list()
    });

    if (isLoading) return <div className="p-4 text-center text-muted-foreground">Loading...</div>;

    if (!conversations?.length) {
        return <div className="p-4 text-center text-muted-foreground">No conversations yet</div>;
    }

    return (
        <div className="flex flex-col gap-1 overflow-y-auto">
            {conversations.map(conv => {
                const isActive = pathname === `/dashboard/messages/${conv.id}`;
                // Determine display user (not me)
                // Ideally backend gives "other participant" or specific title. 
                // For now, take first participant who is not me? Backend didn't filter "me" out in findOne/findAll include logic fully well.
                // Assuming the backend returns ALL participants.
                // We need `useUser` or similar to know "me". 
                // Let's rely on backend returning a proper title or just showing property title for now.

                const title = conv.property?.title || 'Unknown Property';
                const lastMessage = conv.messages?.[0];

                return (
                    <Link
                        key={conv.id}
                        href={`/dashboard/messages/${conv.id}`}
                        className={cn(
                            "flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors",
                            isActive && "bg-muted"
                        )}
                    >
                        <Avatar className="h-10 w-10 border">
                            <AvatarImage src={conv.property?.media?.[0]?.url} className="object-cover" />
                            <AvatarFallback>P</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 overflow-hidden">
                            <div className="flex justify-between items-baseline">
                                <span className="font-medium truncate">{title}</span>
                                {lastMessage && (
                                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                        {formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: true })}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                                {lastMessage ? lastMessage.body : 'No messages yet'}
                            </p>
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}
