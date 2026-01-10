'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Skeleton, Button } from '@propad/ui';
import { formatCurrency } from '@/lib/formatters';
import { ArrowDownLeft, ArrowUpRight, Clock, RefreshCw, AlertCircle, Lock, Undo } from 'lucide-react';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';
import type { WalletLedgerEntry } from '@propad/sdk';

const getBadge = (type: string) => {
    switch (type) {
        case 'CREDIT':
            return <Badge className="bg-green-100 text-green-800"><ArrowDownLeft className="mr-1 h-3 w-3" /> Credit</Badge>;
        case 'DEBIT':
            return <Badge className="bg-red-100 text-red-800"><ArrowUpRight className="mr-1 h-3 w-3" /> Debit</Badge>;
        case 'HOLD':
            return <Badge className="bg-yellow-100 text-yellow-800"><Lock className="mr-1 h-3 w-3" /> Hold</Badge>;
        case 'RELEASE':
            return <Badge className="bg-blue-100 text-blue-800"><Undo className="mr-1 h-3 w-3" /> Release</Badge>;
        case 'REFUND':
            return <Badge className="bg-purple-100 text-purple-800"><RefreshCw className="mr-1 h-3 w-3" /> Refund</Badge>;
        default:
            return <Badge variant="outline">{type}</Badge>;
    }
};

const formatSourceType = (sourceType: string) => {
    return sourceType.replace(/_/g, ' ');
};

export function LedgerTable() {
    const sdk = useAuthenticatedSDK();

    const { data: entries, isLoading, error } = useQuery<WalletLedgerEntry[]>({
        queryKey: ['ledger-my'],
        queryFn: async () => {
            // @ts-ignore - SDK update might not be picked up by TS immediately in IDE
            return sdk!.wallet.getTransactions({ limit: 50 });
        },
        enabled: !!sdk
    });

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Ledger History</CardTitle>
                    <CardDescription>Loading your transactions...</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center justify-between border-b pb-4">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-4 w-24" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Ledger History</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 text-center text-red-500">
                        <AlertCircle className="h-10 w-10 mb-2" />
                        <p>Failed to load ledger history</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (!entries || entries.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Ledger History</CardTitle>
                    <CardDescription>No transactions found</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 text-center text-gray-500">
                        <Clock className="h-10 w-10 mb-2 text-gray-300" />
                        <p>No transactions yet</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Ledger History</CardTitle>
                <CardDescription>A complete log of all funds moving in and out of your wallet</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-500">Description</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-500">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {entries.map((entry) => (
                                <tr key={entry.id}>
                                    <td className="px-4 py-3 text-gray-600">
                                        {new Date(entry.createdAt).toLocaleDateString()} <span className="text-xs text-gray-400">{new Date(entry.createdAt).toLocaleTimeString()}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {getBadge(entry.type)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-gray-900">{formatSourceType(entry.sourceType)}</div>
                                        {entry.metadata?.description && (
                                            <div className="text-xs text-gray-500">{entry.metadata.description}</div>
                                        )}
                                        <div className="text-xs text-gray-400 font-mono mt-0.5" title="Source ID">{entry.sourceId.substring(0, 8)}...</div>
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium">
                                        <span className={
                                            entry.type === 'CREDIT' || entry.type === 'REFUND'
                                                ? 'text-green-600'
                                                : entry.type === 'DEBIT' ? 'text-red-600' : 'text-gray-600'
                                        }>
                                            {entry.type === 'DEBIT' || entry.type === 'HOLD' ? '-' : '+'}
                                            {formatCurrency(entry.amountCents / 100, entry.currency)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}
