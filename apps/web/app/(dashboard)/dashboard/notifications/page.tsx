'use client';

import { useNotifications } from '@/hooks/use-notifications';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@propad/ui';
import { format } from 'date-fns';
import { CheckCheck } from 'lucide-react';

export default function NotificationsPage() {
    const { notifications, isLoading, markAllRead, markRead } = useNotifications();

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Notifications</h1>
                <Button variant="outline" onClick={() => markAllRead()} className="gap-2">
                    <CheckCheck className="h-4 w-4" />
                    Mark all as read
                </Button>
            </div>

            <div className="space-y-4">
                {isLoading ? (
                    <Card><CardContent className="p-8 text-center text-neutral-500">Loading...</CardContent></Card>
                ) : notifications?.length === 0 ? (
                    <Card><CardContent className="p-8 text-center text-neutral-500">No notifications found.</CardContent></Card>
                ) : (
                    notifications?.map((n: any) => (
                        <Card key={n.id} className={`${n.readAt ? 'opacity-80' : 'border-blue-200 bg-blue-50/20'}`}>
                            <div className="p-4 flex gap-4">
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold">{n.title}</h3>
                                        <span className="text-xs text-neutral-500">{format(new Date(n.createdAt), 'PP p')}</span>
                                    </div>
                                    <p className="text-sm text-neutral-600">{n.body}</p>
                                </div>
                                {!n.readAt && (
                                    <Button variant="ghost" size="sm" onClick={() => markRead(n.id)}>
                                        Mark read
                                    </Button>
                                )}
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
