'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Skeleton } from '@propad/ui';
import { useSession } from 'next-auth/react';
import { Gift, Award, TrendingUp, Percent } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { getRequiredPublicApiBaseUrl } from '@/lib/api-base-url';

interface RewardDistribution {
    id: string;
    sourceType: string;
    amountCents: number;
    currency: string;
    reason: string;
    createdAt: string;
    pool: {
        name: string;
    };
}

const getSourceIcon = (type: string) => {
    switch (type) {
        case 'VERIFICATION_APPROVAL':
            return <Award className="h-4 w-4 text-blue-500" />;
        case 'DEAL_COMPLETION':
            return <Gift className="h-4 w-4 text-purple-500" />;
        case 'AD_REVENUE_SHARE':
            return <TrendingUp className="h-4 w-4 text-green-500" />;
        case 'REFERRAL_BONUS':
            return <Percent className="h-4 w-4 text-orange-500" />;
        default:
            return <Gift className="h-4 w-4 text-gray-500" />;
    }
};

const getSourceLabel = (type: string) => {
    return type.replace(/_/g, ' ');
};

export function RewardsHistory() {
    const { data: session } = useSession();
    const apiBaseUrl = getRequiredPublicApiBaseUrl();

    const { data: rewards, isLoading } = useQuery<RewardDistribution[]>({
        queryKey: ['rewards-my'],
        queryFn: async () => {
            // Direct API call until SDK is updated
            const res = await fetch(`${apiBaseUrl}/rewards/my`, {
                headers: {
                    Authorization: `Bearer ${session?.accessToken}`
                }
            });
            if (!res.ok) throw new Error('Failed to fetch rewards');
            return res.json();
        },
        enabled: !!session?.accessToken
    });

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Reward History</CardTitle>
                    <CardDescription>Your earned incentives and bonuses</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!rewards || rewards.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Reward History</CardTitle>
                    <CardDescription>Your earned incentives and bonuses</CardDescription>
                </CardHeader>
                <CardContent className="py-8 text-center text-gray-500">
                    No rewards earned yet. Complete verifications or deals to earn!
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Reward History</CardTitle>
                <CardDescription>Your earned incentives and bonuses from {rewards.length} events</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {rewards.map((reward) => (
                        <div key={reward.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center border">
                                    {getSourceIcon(reward.sourceType)}
                                </div>
                                <div>
                                    <p className="font-medium text-sm text-gray-900">{reward.reason || getSourceLabel(reward.sourceType)}</p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(reward.createdAt).toLocaleDateString()} • {reward.pool?.name}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="font-bold text-green-600">
                                    +{formatCurrency(reward.amountCents / 100, reward.currency)}
                                </span>
                                <div className="mt-1">
                                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-5">
                                        {getSourceLabel(reward.sourceType)}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
