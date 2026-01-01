'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@propad/ui';
import { Button } from '@propad/ui';
import { useAuthenticatedSDK } from '../../../../../../hooks/use-authenticated-sdk';
import { AdSenseDailyStat } from '@propad/sdk';
import { toast } from 'sonner';

export default function AdminAdSensePage() {
    const sdk = useAuthenticatedSDK();
    const [stats, setStats] = useState<AdSenseDailyStat[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchStats = async () => {
        try {
            const data = await sdk.adsense.getStats();
            setStats(data);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const handleSync = async () => {
        setLoading(true);
        try {
            await sdk.adsense.triggerSync();
            toast.success('Sync triggered successfully');
            setTimeout(fetchStats, 2000); // Wait for sync
        } catch (e) {
            toast.error('Sync failed');
        } finally {
            setLoading(false);
        }
    };

    const totalRevenue = stats.reduce((acc, s) => acc + Number(s.revenueMicros), 0) / 1000000;
    const totalImpressions = stats.reduce((acc, s) => acc + s.impressions, 0);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight text-white">Google AdSense</h1>
                <Button onClick={handleSync} disabled={loading} variant="secondary">
                    {loading ? 'Syncing...' : 'Sync Now'}
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-gray-400">Total Revenue (30d)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">${totalRevenue.toFixed(2)}</div>
                    </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-gray-400">Impressions (30d)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">{totalImpressions.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-gray-400">eCPM (Avg)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">
                            ${totalImpressions > 0 ? ((totalRevenue / totalImpressions) * 1000).toFixed(2) : '0.00'}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-white/5 border-white/10">
                <CardHeader>
                    <CardTitle className="text-white">Daily Performance</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="border-b border-white/10 text-gray-400">
                                    <th className="pb-2">Date</th>
                                    <th className="pb-2">Impressions</th>
                                    <th className="pb-2">Clicks</th>
                                    <th className="pb-2">Revenue</th>
                                </tr>
                            </thead>
                            <tbody className="text-white">
                                {stats.map((s) => (
                                    <tr key={s.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                        <td className="py-3">{new Date(s.date).toLocaleDateString()}</td>
                                        <td className="py-3">{s.impressions.toLocaleString()}</td>
                                        <td className="py-3">{s.clicks.toLocaleString()}</td>
                                        <td className="py-3 font-medium text-green-400">${(Number(s.revenueMicros) / 1000000).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {stats.length === 0 && <p className="text-center py-4 text-gray-500">No data available. Trigger sync.</p>}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
