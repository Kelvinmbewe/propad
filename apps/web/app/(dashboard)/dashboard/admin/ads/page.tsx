'use client';

import { Card, CardHeader, CardTitle, CardContent, Button } from '@propad/ui';

export default function AdminAds() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-white">Ads Management</h1>
                <Button className="bg-[color:var(--aurora-color-accent)] text-white">Global Stats</Button>
            </div>

            <Card className="bg-white/5 border-white/10">
                <CardHeader>
                    <CardTitle className="text-white">Pending Approval</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-gray-400 italic">No campaigns awaiting approval.</div>
                </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
                <CardHeader>
                    <CardTitle className="text-white">All Campaigns</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-gray-400 italic">Listing all advertising campaigns...</div>
                </CardContent>
            </Card>
        </div>
    );
}
