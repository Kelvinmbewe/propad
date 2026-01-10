
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';
import { useState, useEffect, useRef } from 'react';
import { Button, Input, ScrollArea, Avatar, AvatarFallback, AvatarImage } from '@propad/ui';
import { Send } from 'lucide-react';
import { useSocket } from '@/hooks/use-socket';

interface ChatWindowProps {
    conversationId: string;
}

export function ChatWindow({ conversationId }: ChatWindowProps) {
    const queryClient = useQueryClient();
    const sdk = useAuthenticatedSDK();
    const socket = useSocket();
    const [body, setBody] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    const { data: messages, isLoading } = useQuery({
        queryKey: ['messages', conversationId],
        queryFn: () => sdk!.messaging.messages.list(conversationId, { limit: 50 }),
        refetchInterval: 5000 // Polling fallback until socket is ready
    });

    const { mutate: sendMessage, isPending } = useMutation({
        mutationFn: (text: string) => sdk!.messaging.messages.send({ conversationId, body: text }),
        onSuccess: () => {
            setBody('');
            queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
            queryClient.invalidateQueries({ queryKey: ['conversations'] }); // Update list snippet
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!body.trim()) return;
        sendMessage(body);
    };

    // Socket Integration
    useEffect(() => {
        if (!socket) return;

        socket.emit('joinRoom', { conversationId });
        console.log('Joined room:', conversationId);

        socket.on('message.new', (message: any) => {
            console.log('New message received:', message);
            queryClient.setQueryData(['messages', conversationId], (old: any) => {
                if (!old) return [message];
                // Check duplicate
                if (old.some((m: any) => m.id === message.id)) return old;
                return [...old, message];
            });
            // Update conversation list last message preview
            // queryClient.invalidateQueries({ queryKey: ['conversations'] }); 
            // Better: update cache directly if possible, or invalidate
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        });

        return () => {
            socket.emit('leaveRoom', { conversationId });
            socket.off('message.new');
        };
    }, [socket, conversationId, queryClient]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    if (isLoading) return <div className="flex-1 flex items-center justify-center">Loading messages...</div>;

    return (
        <div className="flex flex-col h-full">
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                    {messages?.map((msg) => {
                        // Ideally check if msg.senderId === myId to align right
                        // We need `useAuth` or `useUser` context hook to know myId.
                        const isMe = false; // TODO: Implement check

                        return (
                            <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={msg.sender?.profilePhoto as string} />
                                    <AvatarFallback>{msg.sender?.name?.[0] || '?'}</AvatarFallback>
                                </Avatar>
                                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                                    <div className={`p-3 rounded-lg text-sm ${isMe ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                        {msg.body}
                                    </div>
                                    <span className="text-xs text-muted-foreground mt-1">
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={scrollRef} />
                </div>
            </ScrollArea>
            <div className="p-4 border-t">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <Input
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        placeholder="Type a message..."
                        disabled={isPending}
                    />
                    <Button type="submit" size="icon" disabled={isPending || !body.trim()}>
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>
        </div>
    );
}
