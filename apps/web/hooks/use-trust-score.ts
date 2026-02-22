import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { getRequiredPublicApiBaseUrl } from '@/lib/api-base-url';

export function useTrustScore() {
    const { data: session } = useSession();
    const token = session?.accessToken;
    const apiBaseUrl = getRequiredPublicApiBaseUrl();

    return useQuery({
        queryKey: ['trust', 'score'],
        queryFn: async () => {
            if (!token) return { score: 0 };
            const res = await fetch(`${apiBaseUrl}/trust/score`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) return { score: 0 };
            return res.json();
        },
        enabled: !!token
    });
}
