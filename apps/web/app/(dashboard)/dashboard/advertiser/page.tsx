'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@propad/ui';

export default function AdvertiserOverview() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-white">Advertiser Dashboard</h1>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-gray-400">Total Impressions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">128,450</div>
                        <p className="text-xs text-green-400">+12% from last month</p>
                    </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-gray-400">Active Campaigns</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">4</div>
                        <p className="text-xs text-blue-400">2 pending approval</p>
                    </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-gray-400">Wallet Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">$1,240.00</div>
                        <p className="text-xs text-gray-400">USD</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-white/5 border-white/10">
                <CardHeader>
                    <CardTitle className="text-white">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-gray-400 italic">No recent campaigns to display.</div>
                </CardContent>
            </Card>
        </div>
    );
}
