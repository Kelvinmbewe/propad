'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Button, Skeleton, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@propad/ui';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';
import { formatCurrency } from '@/lib/formatters';
import { MoreVertical, CheckCircle, RefreshCw, AlertTriangle, User, ExternalLink } from 'lucide-react';

export default function AdminReferralsPage() {
    const sdk = useAuthenticatedSDK();
    const queryClient = useQueryClient();

    const { data: referrals, isLoading } = useQuery({
        queryKey: ['admin-referrals'],
        queryFn: () => sdk!.referrals.admin.all(),
        enabled: !!sdk
    });

    const resolveMutation = useMutation({
        mutationFn: (id: string) => sdk!.referrals.admin.resolve(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-referrals'] });
            alert('Referral resolved and reward triggered.');
        },
        onError: (err: any) => {
            alert(`Error: ${err.message || 'Failed to resolve'}`);
        }
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'REWARDED':
                return <Badge className="bg-emerald-100 text-emerald-800 border-none">Rewarded</Badge>;
            case 'QUALIFIED':
                return <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 border-none">Qualified</Badge>;
            case 'FLAGGED':
                return <Badge variant="destructive" className="bg-red-100 text-red-800 border-none flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Flagged</Badge>;
            case 'PENDING':
                return <Badge variant="outline">Pending</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Referral Management</h1>
                    <p className="text-slate-500">Monitor and resolve platform referrals</p>
                </div>
                <Button variant="outline" onClick={() => queryClient.invalidateQueries()}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </Button>
            </div>

            <Card className="border-none shadow-md overflow-hidden">
                <CardHeader className="bg-slate-50/50">
                    <CardTitle>System Referrals</CardTitle>
                    <CardDescription>All signups tracked with referral codes</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-y">
                                <TableHead className="w-[200px] py-4">Referrer</TableHead>
                                <TableHead className="w-[200px]">Referee</TableHead>
                                <TableHead>Source</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [1, 2, 3, 4, 5].map(i => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : !referrals || referrals.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-48 text-center text-slate-400">
                                        No referrals found in the system.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                referrals.map((ref: any) => (
                                    <TableRow key={ref.id} className="hover:bg-slate-50 transition-colors">
                                        <TableCell className="py-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium">{ref.referrer?.name || 'Unknown'}</span>
                                                <span className="text-xs text-slate-400">{ref.referrer?.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-700">{ref.referee?.name || 'New User'}</span>
                                                <span className="text-xs text-slate-400">{ref.referee?.email || 'N/A'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                                                {ref.source.replace('_', ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(ref.status)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {ref.status !== 'REWARDED' ? (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                            className="text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50"
                                                            onClick={() => resolveMutation.mutate(ref.id)}
                                                        >
                                                            <CheckCircle className="mr-2 h-4 w-4" /> Force Resolve
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => window.open(`/admin/users/${ref.refereeId}`, '_blank')}>
                                                            <User className="mr-2 h-4 w-4" /> View Referee
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => window.open(`/admin/users/${ref.referrerId}`, '_blank')}>
                                                            <User className="mr-2 h-4 w-4" /> View Referrer
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            ) : (
                                                <div className="text-xs text-emerald-600 font-bold px-2 py-1">
                                                    +{formatCurrency(ref.rewardCents / 100, 'USD')}
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
