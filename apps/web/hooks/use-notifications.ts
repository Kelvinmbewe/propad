import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedSDK } from './use-authenticated-sdk';
import { useSession } from 'next-auth/react';

export function useNotifications() {
    const sdk = useAuthenticatedSDK();
    const { data: session } = useSession();
    const queryClient = useQueryClient();
    const token = session?.accessToken;

    const { data: notifications, isLoading } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            if (!token) return [];
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/notifications`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return res.json();
        },
        enabled: !!token,
        // Poll every minute for new notifications
        refetchInterval: 60000
    });

    const markRead = useMutation({
        mutationFn: async (id: string) => {
            await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/notifications/${id}/read`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
    });

    const markAllRead = useMutation({
        mutationFn: async () => {
            await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/notifications/read-all`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
    });

    const unreadCount = notifications?.filter((n: any) => !n.readAt).length || 0;

    return {
        notifications,
        isLoading,
        unreadCount,
        markRead: (id: string) => markRead.mutate(id),
        markAllRead: () => markAllRead.mutate()
    };
}
