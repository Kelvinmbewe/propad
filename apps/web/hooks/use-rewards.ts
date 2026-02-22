import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedSDK } from './use-authenticated-sdk';

export function useRewards() {
    const sdk = useAuthenticatedSDK();

    const { data: rewards, isLoading: isLoadingRewards } = useQuery({
        queryKey: ['rewards', 'my'],
        queryFn: () => sdk!.rewards.my(),
        enabled: !!sdk,
    });

    const { data: pools, isLoading: isLoadingPools } = useQuery({
        queryKey: ['rewards', 'pools'],
        queryFn: () => sdk!.rewards.pools(),
        enabled: !!sdk,
    });

    return {
        rewards,
        pools,
        isLoading: isLoadingRewards || isLoadingPools,
    };
}
