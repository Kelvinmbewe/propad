'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@propad/ui';
import { useSession } from 'next-auth/react';
import { formatCurrency } from '@/lib/formatters';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

export default function AdminRewards() {
    const { data: session } = useSession();
    const [calculating, setCalculating] = useState(false);

    const { data: pools, isLoading } = useQuery({
        queryKey: ['admin-reward-pools'],
        queryFn: async () => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/rewards/pools`, {
                headers: { Authorization: `Bearer ${session?.accessToken}` }
            });
            if (!res.ok) throw new Error('Failed to fetch pools');
            return res.json();
        },
        enabled: !!session?.accessToken
    });

    const triggerRevShare = async () => {
        if (!confirm('Are you sure you want to trigger revenue share distribution?')) return;
        setCalculating(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/rewards/recalculate-revshare`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${session?.accessToken}` }
            });
            const data = await res.json();
            alert(`Distribution triggered: ${JSON.stringify(data)}`);
            // Refresh pools?
        } catch (e) {
            alert('Failed to trigger');
        } finally {
            setCalculating(false);
        }
    };

    // Derived stats
    const totalPooled = pools?.reduce((acc: number, p: any) => acc + p.totalUsdCents, 0) || 0;
    const totalSpent = pools?.reduce((acc: number, p: any) => acc + p.spentUsdCents, 0) || 0;
    // const activeAgents = ... need separate endpoint or metrics

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-white">Rewards Management</h1>
                <div className="flex gap-2">
                    <Button
                        variant="secondary"
                        onClick={triggerRevShare}
                        disabled={calculating}
                    >
                        {calculating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Trigger RevShare
                    </Button>
                    <Button className="bg-[color:var(--aurora-color-accent)] text-white">Create Reward Pool</Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-gray-400">Total Pooled Funds</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">
                            {formatCurrency(totalPooled / 100, 'USD')}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-gray-400">Total Distributed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">
                            {formatCurrency(totalSpent / 100, 'USD')}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-gray-400">Availability</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">
                            {formatCurrency((totalPooled - totalSpent) / 100, 'USD')}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-white/5 border-white/10">
                <CardHeader>
                    <CardTitle className="text-white">Active Pools</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-gray-400">Loading pools...</div>
                    ) : (
                        <div className="space-y-4">
                            {pools?.map((pool: any) => (
                                <div key={pool.id} className="flex justify-between items-center bg-white/5 p-4 rounded border border-white/10">
                                    <div>
                                        <p className="font-medium text-white">{pool.name}</p>
                                        <p className="text-sm text-gray-400">{pool.currency} • Created {new Date(pool.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-white font-mono">{formatCurrency(pool.totalUsdCents / 100, pool.currency)}</p>
                                        <div className="mt-1">
                                            <Badge variant={pool.isActive ? 'default' : 'secondary'}>{pool.isActive ? 'Active' : 'Inactive'}</Badge>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
