import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedSDK } from './use-authenticated-sdk';

export function useAdvertiser() {
    const sdk = useAuthenticatedSDK();

    const { data: campaigns, isLoading: isLoadingCampaigns } = useQuery({
        queryKey: ['advertiser', 'campaigns'],
        queryFn: () => sdk!.advertiser.getCampaigns(),
        enabled: !!sdk,
    });

    const { data: stats, isLoading: isLoadingStats } = useQuery({
        queryKey: ['advertiser', 'stats'],
        queryFn: () => sdk!.advertiser.getStats(),
        enabled: !!sdk,
    });

    return {
        campaigns,
        stats,
        isLoading: isLoadingCampaigns || isLoadingStats,
    };
}
