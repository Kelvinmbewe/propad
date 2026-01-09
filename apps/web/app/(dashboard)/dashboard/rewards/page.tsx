'use client';

import { useRewards } from '@/hooks/use-rewards';
import { Card, CardContent, CardHeader, CardTitle, Badge, Skeleton } from '@propad/ui';
import { formatCurrency } from '@/lib/formatters';
import { Trophy, Gift, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function RewardsPage() {
    const { rewards, isLoading } = useRewards();

    const totalEarned = rewards?.reduce((acc: number, curr: any) => acc + curr.amountCents, 0) || 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">My Rewards</h1>
                <Badge variant="default" className="text-lg px-4 py-1">
                    Total: {formatCurrency(totalEarned / 100, 'USD')}
                </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-orange-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-orange-800">Reward Points</CardTitle>
                        <Trophy className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-900">{rewards?.length || 0}</div>
                        <p className="text-xs text-orange-700">Total distributions received</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>History</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
                        </div>
                    ) : !rewards || rewards.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground flex flex-col items-center justify-center">
                            <div className="bg-orange-50 p-4 rounded-full mb-3">
                                <Gift className="h-8 w-8 text-orange-300" />
                            </div>
                            <h3 className="font-semibold text-neutral-900">No rewards yet</h3>
                            <p className="text-sm max-w-xs mx-auto mt-1">
                                Complete verifications and refer users to start earning rewards.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {rewards.map((reward: any) => (
                                <div key={reward.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/5 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-green-100 rounded-full">
                                            <Gift className="h-5 w-5 text-green-700" />
                                        </div>
                                        <div>
                                            <p className="font-medium">{reward.reason || 'Reward Distribution'}</p>
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {format(new Date(reward.createdAt), 'PPP')}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="font-bold text-green-700">
                                        +{formatCurrency(reward.amountCents / 100, reward.currency)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
