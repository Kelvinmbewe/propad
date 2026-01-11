'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api as sdk } from '@/lib/api-client';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Button,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    useToast
} from '@propad/ui';
import { formatCurrency } from '@/lib/formatters';
import { Download, AlertTriangle, CheckCircle, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { format, subDays } from 'date-fns';

export default function FinanceDashboardPage() {
    const [dateRange, setDateRange] = useState({
        start: subDays(new Date(), 30).toISOString(),
        end: new Date().toISOString()
    });

    const { toast } = useToast();

    const { data: ledger, isLoading: isLoadingLedger } = useQuery({
        queryKey: ['admin-finance-ledger', dateRange],
        queryFn: () => sdk.admin.reports.getLedger({
            startDate: dateRange.start,
            endDate: dateRange.end
        })
    });

    const { data: revenue, isLoading: isLoadingRevenue } = useQuery({
        queryKey: ['admin-finance-revenue', dateRange],
        queryFn: () => sdk.admin.reports.getRevenue({
            startDate: dateRange.start,
            endDate: dateRange.end
        })
    });

    const { data: liabilities, isLoading: isLoadingLiabilities } = useQuery({
        queryKey: ['admin-finance-liabilities'],
        queryFn: () => sdk.admin.reports.getLiabilities()
    });

    const { data: integrity, isLoading: isLoadingIntegrity } = useQuery({
        queryKey: ['admin-finance-integrity'],
        queryFn: () => sdk.admin.reports.checkIntegrity()
    });

    const handleDownloadCsv = async () => {
        try {
            const blob = await sdk.admin.reports.downloadLedgerCsv({
                startDate: dateRange.start,
                endDate: dateRange.end
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ledger-${format(new Date(), 'yyyy-MM-dd')}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            toast({ title: 'Download failed', variant: 'destructive' });
        }
    };

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Financial Reports</h2>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" onClick={handleDownloadCsv}>
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="ledger">Ledger Summary</TabsTrigger>
                    <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Revenue (Period)</CardTitle>
                                <span className="text-muted-foreground">$</span>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {isLoadingRevenue ? <Loader2 className="h-4 w-4 animate-spin" /> : formatCurrency((revenue?.total || 0) / 100)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    From Ad Spend and Fees
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Outstanding Liability</CardTitle>
                                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {isLoadingLiabilities ? <Loader2 className="h-4 w-4 animate-spin" /> : formatCurrency((liabilities?.totalLiabilityCents || 0) / 100)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Total User Wallet Balances
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Platform Integrity</CardTitle>
                                {integrity?.valid ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-red-500" />}
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {isLoadingIntegrity ? 'Checking...' : (integrity?.valid ? 'Healthy' : 'Issues Found')}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {integrity?.anomalies?.length || 0} Anomalies Detected
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="ledger">
                    <Card>
                        <CardHeader>
                            <CardTitle>Daily Ledger Summary</CardTitle>
                            <CardDescription>Aggregated movements by day.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Credits</TableHead>
                                        <TableHead>Debits</TableHead>
                                        <TableHead>Net Change</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingLedger ? (
                                        <TableRow><TableCell colSpan={4} className="text-center">Loading...</TableCell></TableRow>
                                    ) : ledger?.map((row: any) => (
                                        <TableRow key={row.date}>
                                            <TableCell>{row.date}</TableCell>
                                            <TableCell className="text-green-600">+{formatCurrency(row.credits / 100)}</TableCell>
                                            <TableCell className="text-red-500">-{formatCurrency(row.debits / 100)}</TableCell>
                                            <TableCell className="font-bold">{formatCurrency(row.netChange / 100)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="reconciliation">
                    <Card>
                        <CardHeader>
                            <CardTitle>Integrity Issues</CardTitle>
                            <CardDescription>Accounts with negative balances or data mismatches.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {integrity?.valid ? (
                                <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                                    <CheckCircle className="h-12 w-12 mb-4 text-green-500" />
                                    <p>No anomalies detected. Ledger is balanced.</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>User ID</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Issue</TableHead>
                                            <TableHead>Balance</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {integrity?.anomalies?.map((issue: any) => (
                                            <TableRow key={issue.userId}>
                                                <TableCell className="font-mono text-xs">{issue.userId}</TableCell>
                                                <TableCell>{issue.email}</TableCell>
                                                <TableCell><span className="text-red-500 font-bold">{issue.issue}</span></TableCell>
                                                <TableCell>{formatCurrency(issue.balance / 100)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

            </Tabs>
        </div>
    );
}
