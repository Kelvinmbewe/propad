'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Input, Skeleton, Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@propad/ui';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';
import { Share2, Copy, Check, Users, DollarSign, Gift, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

export function ReferralDashboard() {
    const sdk = useAuthenticatedSDK();
    const [copied, setCopied] = useState(false);

    const { data: codeData, isLoading: loadingCode } = useQuery({
        queryKey: ['referral-code'],
        queryFn: () => sdk!.referrals.getCode(),
        enabled: !!sdk
    });

    const { data: stats, isLoading: loadingStats } = useQuery({
        queryKey: ['referral-stats'],
        queryFn: () => sdk!.referrals.stats(),
        enabled: !!sdk
    });

    const { data: invitedUsers, isLoading: loadingInvited } = useQuery({
        queryKey: ['referral-invited'],
        queryFn: () => sdk!.referrals.my(),
        enabled: !!sdk
    });

    const referralLink = typeof window !== 'undefined' && codeData?.code
        ? `${window.location.origin}/auth/signup?ref=${codeData.code}`
        : '';

    const copyToClipboard = () => {
        if (!referralLink) return;
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loadingCode || loadingStats) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-[200px] w-full" />
                <div className="grid gap-4 md:grid-cols-3">
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Hero / Invite Card */}
            <Card className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white overflow-hidden border-none shadow-xl">
                <CardContent className="p-8 md:p-12 relative">
                    <div className="relative z-10 max-w-2xl">
                        <h2 className="text-3xl font-bold mb-4">Invite Friends, Earn Rewards</h2>
                        <p className="text-indigo-100 text-lg mb-8">
                            Share Propad with your network. When they join and qualify, you both get bonuses.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Input
                                    value={referralLink}
                                    readOnly
                                    className="bg-white/10 border-white/20 text-white placeholder:text-indigo-200 focus-visible:ring-indigo-300 h-12 pr-12"
                                />
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="absolute right-1 top-1 text-white hover:bg-white/20"
                                    onClick={copyToClipboard}
                                >
                                    {copied ? <Check className="h-5 w-5 text-green-400" /> : <Copy className="h-5 w-5" />}
                                </Button>
                            </div>
                            <Button onClick={copyToClipboard} className="bg-white text-indigo-700 hover:bg-indigo-50 h-12 px-8 font-semibold">
                                {copied ? 'Copied!' : 'Copy Link'}
                            </Button>
                        </div>
                    </div>

                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 opacity-20">
                        <Gift className="w-64 h-64 text-white" />
                    </div>
                </CardContent>
            </Card>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-indigo-500" />
                            Total Invited
                        </CardDescription>
                        <CardTitle className="text-4xl font-extrabold">{stats?.totalInvited || 0}</CardTitle>
                    </CardHeader>
                </Card>

                <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Gift className="h-4 w-4 text-emerald-500" />
                            Qualified
                        </CardDescription>
                        <CardTitle className="text-4xl font-extrabold text-emerald-600">{stats?.totalQualified || 0}</CardTitle>
                    </CardHeader>
                </Card>

                <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-amber-500" />
                            Total Earned
                        </CardDescription>
                        <CardTitle className="text-4xl font-extrabold text-amber-600">{formatCurrency((stats?.totalEarningsCents || 0) / 100, 'USD')}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Invited Users List */}
            <Card className="border-none shadow-md overflow-hidden">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Invited Users</CardTitle>
                            <CardDescription>Status of your referrals</CardDescription>
                        </div>
                        <Badge variant="outline" className="px-3 py-1">{invitedUsers?.length || 0} Referrals</Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50 border-y">
                                    <TableHead className="w-[200px] py-4">User</TableHead>
                                    <TableHead>Joined At</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Bonus</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingInvited ? (
                                    [1, 2, 3].map(i => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : !invitedUsers || invitedUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-32 text-center text-slate-400">
                                            No referrals yet. Start sharing your link!
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    invitedUsers.map((ref: any) => (
                                        <TableRow key={ref.id} className="hover:bg-slate-50 transition-colors cursor-default group">
                                            <TableCell className="font-medium py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                                                        {ref.referee?.name?.[0] || 'U'}
                                                    </div>
                                                    <span className="group-hover:text-indigo-600 transition-colors">
                                                        {ref.referee?.name || 'New user'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-slate-500">
                                                {new Date(ref.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={ref.status === 'REWARDED' ? 'default' : ref.status === 'QUALIFIED' ? 'secondary' : 'outline'}
                                                    className={
                                                        ref.status === 'REWARDED' ? 'bg-emerald-100 text-emerald-800 border-none' :
                                                            ref.status === 'QUALIFIED' ? 'bg-indigo-100 text-indigo-800 border-none' : ''
                                                    }
                                                >
                                                    {ref.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-bold">
                                                {ref.rewardCents > 0 ? (
                                                    <span className="text-emerald-600">+{formatCurrency(ref.rewardCents / 100, 'USD')}</span>
                                                ) : (
                                                    <span className="text-slate-400">$0.00</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
