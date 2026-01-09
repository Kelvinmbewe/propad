'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedSDK } from './use-authenticated-sdk';

export function useDashboardMetrics() {
    const sdk = useAuthenticatedSDK();
    return useQuery({
        queryKey: ['dashboard', 'overview'],
        queryFn: () => sdk!.dashboard.overview(),
        enabled: !!sdk,
        staleTime: 60 * 1000, // 1 minute
    });
}
