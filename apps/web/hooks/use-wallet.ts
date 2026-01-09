import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedSDK } from './use-authenticated-sdk';

export function useWallet() {
    const sdk = useAuthenticatedSDK();

    const { data: overview, isLoading } = useQuery({
        queryKey: ['wallet', 'overview'],
        queryFn: () => sdk.wallet.getOverview(),
        enabled: !!sdk,
    });

    return {
        overview,
        isLoading,
    };
}
