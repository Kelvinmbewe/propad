'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedSDK } from './use-authenticated-sdk';

export function useDashboardMetrics() {
    const sdk = useAuthenticatedSDK();
    return useQuery({
        queryKey: ['dashboard', 'overview'],
        queryFn: async () => {
            const data = await sdk?.dashboard?.overview();
            return data || {};
        },
        enabled: !!sdk,
        staleTime: 60 * 1000, // 1 minute
    });
}
