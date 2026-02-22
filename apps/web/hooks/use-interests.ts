import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedSDK } from './use-authenticated-sdk';

export function useInterests() {
    const sdk = useAuthenticatedSDK();
    const queryClient = useQueryClient();

    const { data: savedProperties, isLoading } = useQuery({
        queryKey: ['interests', 'my'],
        queryFn: () => sdk!.interests.my(),
        enabled: !!sdk,
    });

    const toggleInterest = useMutation({
        mutationFn: (propertyId: string) => sdk!.interests.toggle(propertyId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['interests', 'my'] });
            // Invalidate specific property queries if needed
        },
    });

    return {
        savedProperties,
        isLoading,
        toggleInterest,
    };
}
