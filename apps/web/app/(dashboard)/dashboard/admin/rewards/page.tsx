'use client';

import { Card, CardHeader, CardTitle, CardContent, Button } from '@propad/ui';

export default function AdminRewards() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-white">Rewards Management</h1>
                <Button className="bg-[color:var(--aurora-color-accent)] text-white">Create Reward Pool</Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-gray-400">Total Pooled Funds</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">$25,000.00</div>
                    </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-gray-400">Total Distributed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">$12,450.00</div>
                    </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-gray-400">Active Agents</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">142</div>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-white/5 border-white/10">
                <CardHeader>
                    <CardTitle className="text-white">Active Pools</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-gray-400 italic">Listing all active reward pools...</div>
                </CardContent>
            </Card>
        </div>
    );
}
