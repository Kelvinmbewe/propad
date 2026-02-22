'use client';

import { useEffect, useState } from 'react';

import { AdvertiserInvoice } from '@propad/sdk';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Badge, Button, Alert, AlertDescription, AlertTitle } from '@propad/ui';
import { Loader2, Receipt, AlertCircle } from 'lucide-react';
import { useSdkClient } from '@/hooks/use-sdk-client';
import { ClientState } from '@/components/client-state';

export default function AdvertiserBillingPage() {
    const { sdk, status, message } = useSdkClient();
    const [invoices, setInvoices] = useState<AdvertiserInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (status === 'ready') {
            loadInvoices();
        }
    }, [status]);

    const loadInvoices = async () => {
        try {
            if (!sdk) {
                throw new Error('Billing client not ready');
            }
            setLoading(true);
            setError('');
            const data = await sdk.ads.getMyInvoices();
            setInvoices(data ?? []);
        } catch (err) {
            console.error('Failed to load invoices:', err);
            setError('Failed to load invoices. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PAID':
                return <Badge variant="success">Paid</Badge>;
            case 'OPEN':
                return <Badge variant="warning">Open</Badge>;
            case 'DRAFT':
                return <Badge variant="secondary">Draft</Badge>;
            case 'VOID':
                return <Badge variant="destructive">Void</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    if (status !== 'ready') {
        return <ClientState status={status} message={message} title="Advertiser billing" />;
    }

    if (loading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Billing & Invoices</h1>
                <p className="text-muted-foreground">
                    Manage your campaign invoices and payment history.
                </p>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                        {error}
                        <div className="mt-3">
                            <Button variant="outline" size="sm" onClick={loadInvoices}>
                                Retry
                            </Button>
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Invoice History</CardTitle>
                    <CardDescription>
                        A clear view of all your transactions and their status.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Issued</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {error ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                        Unable to load invoices.
                                    </TableCell>
                                </TableRow>
                            ) : invoices.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                        No invoices found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                invoices.map((invoice) => (
                                    <TableRow key={invoice.id}>
                                        <TableCell>
                                            {new Date(invoice.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{invoice.purpose}</span>
                                                <span className="text-xs text-muted-foreground line-clamp-1">
                                                    {invoice.lines?.[0]?.description || 'Invoice'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            ${(invoice.amountCents / 100).toFixed(2)}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm">
                                                <Receipt className="mr-2 h-4 w-4" />
                                                View
                                            </Button>
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
