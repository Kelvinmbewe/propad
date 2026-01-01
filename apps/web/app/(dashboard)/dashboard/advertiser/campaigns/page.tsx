'use client';

import { Card, CardHeader, CardTitle, CardContent, Button } from '@propad/ui';

export default function AdvertiserCampaigns() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-white">My Campaigns</h1>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">Create Campaign</Button>
            </div>

            <Card className="bg-white/5 border-white/10">
                <CardContent className="p-0">
                    <table className="w-full text-left text-sm text-gray-300">
                        <thead className="bg-white/5 text-gray-400">
                            <tr>
                                <th className="px-6 py-3 font-medium">Campaign Name</th>
                                <th className="px-6 py-3 font-medium">Status</th>
                                <th className="px-6 py-3 font-medium">Start Date</th>
                                <th className="px-6 py-3 font-medium">Impressions</th>
                                <th className="px-6 py-3 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            <tr>
                                <td className="px-6 py-4">Winter Rentals Promo</td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-1 text-xs font-medium text-green-400">
                                        Active
                                    </span>
                                </td>
                                <td className="px-6 py-4">Jan 1, 2026</td>
                                <td className="px-6 py-4">42,300</td>
                                <td className="px-6 py-4">
                                    <button className="text-blue-400 hover:underline">Edit</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}
