'use client';
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Input, Button, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Skeleton } from '@propad/ui';
import { formatCurrency } from '@/lib/formatters';
import { ArrowDownLeft, ArrowUpRight, Lock, Undo, RefreshCw, Search, Filter } from 'lucide-react';
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

export default function AdminLedgerPage() {
    const sdk = useAuthenticatedSDK();
    const [filters, setFilters] = useState({
        userId: '',
        type: 'ALL',
        sourceType: 'ALL'
    });
    const [debouncedUserId, setDebouncedUserId] = useState('');

    const { data: entries, isLoading, refetch } = useQuery<WalletLedgerEntry[]>({
        queryKey: ['admin-ledger', debouncedUserId, filters.type, filters.sourceType],
        queryFn: async () => {
            return sdk!.admin.ledger.search({
                userId: debouncedUserId || undefined,
                type: filters.type === 'ALL' ? undefined : filters.type,
                sourceType: filters.sourceType === 'ALL' ? undefined : filters.sourceType,
                limit: 50
            });
        },
        enabled: !!sdk
    });

    const handleSearch = () => {
        setDebouncedUserId(filters.userId);
    };

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-bold">Global Ledger</h1>
                <p className="text-sm text-gray-600">Audit all money movement across the platform</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Filters</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <Input
                                placeholder="User ID..."
                                value={filters.userId}
                                onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                        <div className="w-[180px]">
                            <Select
                                value={filters.type}
                                onValueChange={(value) => setFilters({ ...filters, type: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Types</SelectItem>
                                    <SelectItem value="CREDIT">Credit</SelectItem>
                                    <SelectItem value="DEBIT">Debit</SelectItem>
                                    <SelectItem value="HOLD">Hold</SelectItem>
                                    <SelectItem value="RELEASE">Release</SelectItem>
                                    <SelectItem value="REFUND">Refund</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-[220px]">
                            <Select
                                value={filters.sourceType}
                                onValueChange={(value) => setFilters({ ...filters, sourceType: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Source" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Sources</SelectItem>
                                    <SelectItem value="AD_SPEND">Ad Spend</SelectItem>
                                    <SelectItem value="REWARD_EARNED">Reward Earned</SelectItem>
                                    <SelectItem value="COMMISSION_EARNED">Commission</SelectItem>
                                    <SelectItem value="PAYOUT">Payout</SelectItem>
                                    <SelectItem value="AD_REFUND">Ad Refund</SelectItem>
                                    <SelectItem value="REFERRAL">Referral</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={handleSearch}><Search className="mr-2 h-4 w-4" /> Filter</Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    <div className="rounded-md border">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500">User ID</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500">Description</th>
                                    <th className="px-4 py-3 text-right font-medium text-gray-500">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {isLoading ? (
                                    [1, 2, 3, 4, 5].map(i => (
                                        <tr key={i}>
                                            <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                                            <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                                            <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                                            <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                                            <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                                        </tr>
                                    ))
                                ) : !entries || entries.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                            No ledger entries found matching your criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    entries.map((entry) => (
                                        <tr key={entry.id}>
                                            <td className="px-4 py-3 text-gray-600">
                                                {new Date(entry.createdAt).toLocaleDateString()} <span className="text-xs text-gray-400">{new Date(entry.createdAt).toLocaleTimeString()}</span>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-blue-600">
                                                {entry.userId}
                                            </td>
                                            <td className="px-4 py-3">
                                                {getBadge(entry.type)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900">{entry.sourceType}</div>
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
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
