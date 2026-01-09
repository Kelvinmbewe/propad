'use client';

import { useState } from 'react';
import { Bell, Check } from 'lucide-react';
import { Button, Popover, PopoverContent, PopoverTrigger, Badge, ScrollArea } from '@propad/ui';
import { useNotifications } from '@/hooks/use-notifications';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';

export function NotificationsBell() {
    const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
    const [open, setOpen] = useState(false);
    const router = useRouter();

    const handleNotificationClick = (n: any) => {
        if (!n.readAt) markRead(n.id);
        setOpen(false);
        if (n.url) router.push(n.url);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]"
                        >
                            {unreadCount}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between p-4 border-b">
                    <h4 className="font-semibold">Notifications</h4>
                    {unreadCount > 0 && <Button variant="ghost" size="sm" onClick={() => markAllRead()} className="text-xs h-auto py-1">Mark all read</Button>}
                </div>
                <ScrollArea className="h-[300px]">
                    {notifications?.length === 0 ? (
                        <div className="p-4 text-center text-sm text-neutral-500">No notifications</div>
                    ) : (
                        <div className="divide-y">
                            {notifications?.map((n: any) => (
                                <div
                                    key={n.id}
                                    className={`p-4 cursor-pointer hover:bg-neutral-50 transition-colors ${!n.readAt ? 'bg-blue-50/50' : ''}`}
                                    onClick={() => handleNotificationClick(n)}
                                >
                                    <div className="flex justify-between gap-2 mb-1">
                                        <span className="font-medium text-sm">{n.title}</span>
                                        <span className="text-[10px] text-neutral-400 shrink-0">
                                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-neutral-600 line-clamp-2">{n.body}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
                <div className="p-2 border-t text-center">
                    <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => { setOpen(false); router.push('/dashboard/notifications'); }}>
                        View all notifications
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
