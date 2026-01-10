'use client';

import { useEffect, useState } from 'react';
import { sdk } from '@propad/sdk';
import { AdvertiserInvoice } from '@propad/sdk';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Badge, Button, Alert, AlertDescription, AlertTitle } from '@propad/ui';
import { Loader2, Receipt, AlertCircle } from 'lucide-react';

export default function AdvertiserBillingPage() {
    const [invoices, setInvoices] = useState<AdvertiserInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadInvoices();
    }, []);

    const loadInvoices = async () => {
        try {
            const data = await sdk.ads.getMyInvoices();
            setInvoices(data);
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
                    <AlertDescription>{error}</AlertDescription>
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
                            {invoices.length === 0 ? (
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
