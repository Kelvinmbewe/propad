'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@propad/ui';

export default function AdminLedger() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-white">System Ledger</h1>
            </div>

            <Card className="bg-white/5 border-white/10">
                <CardHeader>
                    <CardTitle className="text-white">Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    <table className="w-full text-left text-sm text-gray-300">
                        <thead className="bg-white/5 text-gray-400">
                            <tr>
                                <th className="px-6 py-3 font-medium">Date</th>
                                <th className="px-6 py-3 font-medium">User</th>
                                <th className="px-6 py-3 font-medium">Type</th>
                                <th className="px-6 py-3 font-medium">Amount</th>
                                <th className="px-6 py-3 font-medium">Source</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            <tr className="text-gray-500">
                                <td colSpan={5} className="px-6 py-8 text-center">Loading ledger entries...</td>
                            </tr>
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}
