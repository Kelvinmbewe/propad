'use client';

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, useToast } from '@propad/ui';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';
import { useRouter } from 'next/navigation';

interface ApplicationStatusSelectProps {
    applicationId: string;
    currentStatus: string;
}

const statuses = [
    'SUBMITTED',
    'REVIEWING',
    'APPROVED',
    'REJECTED',
    'CANCELLED',
];

export function ApplicationStatusSelect({ applicationId, currentStatus }: ApplicationStatusSelectProps) {
    const [status, setStatus] = useState(currentStatus);
    const [loading, setLoading] = useState(false);
    const sdk = useAuthenticatedSDK();
    const { toast } = useToast();
    const router = useRouter();

    const handleStatusChange = async (newStatus: string) => {
        if (!sdk) return;
        setLoading(true);
        setStatus(newStatus); // Optimistic update

        try {
            await sdk.applications.updateStatus(applicationId, newStatus);
            toast({
                title: 'Status Updated',
                description: `Application status changed to ${newStatus}.`,
            });
            router.refresh();
        } catch (error) {
            console.error(error);
            setStatus(currentStatus); // Revert
            toast({
                title: 'Update Failed',
                description: 'Failed to update application status.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Select value={status} onValueChange={handleStatusChange} disabled={loading}>
            <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
                {statuses.map((s) => (
                    <SelectItem key={s} value={s}>
                        {s}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
