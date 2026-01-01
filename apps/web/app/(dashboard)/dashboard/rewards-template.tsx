'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@propad/ui';

export default function RewardsPage({ title }: { title: string }) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-white">{title}</h1>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-gray-400">Total Rewards Earned</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">$450.00</div>
                        <p className="text-xs text-green-400">+ $25.00 this week</p>
                    </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-gray-400">Points Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">4,500</div>
                        <p className="text-xs text-blue-400">Silver Tier</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-white/5 border-white/10">
                <CardHeader>
                    <CardTitle className="text-white">Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center justify-between border-b border-white/5 pb-4 last:border-0 last:pb-0">
                                <div>
                                    <div className="font-medium text-white">Listing Verified Reward</div>
                                    <div className="text-xs text-gray-400">Jan {i}, 2026</div>
                                </div>
                                <div className="text-green-400 font-bold">+$5.00</div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
