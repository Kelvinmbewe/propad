import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedSDK } from './use-authenticated-sdk';

export function useLeads() {
    const sdk = useAuthenticatedSDK();
    const queryClient = useQueryClient();

    const { data: leads, isLoading } = useQuery({
        queryKey: ['leads', 'list'],
        queryFn: () => sdk!.leads.findAll(),
        enabled: !!sdk,
    });

    const updateStatus = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            sdk!.leads.updateStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leads', 'list'] });
        },
    });

    return {
        leads,
        isLoading,
        updateStatus,
    };
}
