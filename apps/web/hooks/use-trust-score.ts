import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

export function useTrustScore() {
    const { data: session } = useSession();
    const token = session?.accessToken;

    return useQuery({
        queryKey: ['trust', 'score'],
        queryFn: async () => {
            if (!token) return { score: 0 };
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/trust/score`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) return { score: 0 };
            return res.json();
        },
        enabled: !!token
    });
}
