'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@propad/ui';
import { Button } from '@propad/ui';
import { Input } from '@propad/ui';
import { useAuthenticatedSDK } from '../../../../../../hooks/use-authenticated-sdk';
import { PayoutMethod, PayoutRequest } from '@propad/sdk';
import { toast } from 'sonner';

export default function AgentPayoutsPage() {
    const sdk = useAuthenticatedSDK();
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState<PayoutMethod>(PayoutMethod.MOBILE_MONEY); // Default
    const [accountId, setAccountId] = useState('');
    const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchPayouts = async () => {
        try {
            const data = await sdk.payouts.getMyPayouts();
            setPayouts(data);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchPayouts();
    }, []);

    const handleRequest = async () => {
        if (!amount || !accountId) return;
        setLoading(true);
        try {
            await sdk.payouts.requestPayout({
                amountCents: Number(amount) * 100, // Convert to cents
                method: method,
                accountId: accountId, // In real app, this should be selected from saved accounts
            });
            toast.success('Payout requested successfully');
            setAmount('');
            fetchPayouts();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Failed to request payout');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Wallet & Payouts</h1>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Request Payout</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Amount ($)</label>
                            <Input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Method</label>
                            <select
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                value={method}
                                onChange={(e) => setMethod(e.target.value as PayoutMethod)}
                            >
                                <option value="MOBILE_MONEY">Ecocash/OneMoney</option>
                                <option value="BANK_TRANSFER">Bank Transfer</option>
                                <option value="CASH">Cash Collection</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Account ID (Testing)</label>
                            <Input
                                value={accountId}
                                onChange={(e) => setAccountId(e.target.value)}
                                placeholder="Enter Payout Account ID"
                            />
                            <p className="text-xs text-muted-foreground">In production, select from saved accounts.</p>
                        </div>

                        <Button onClick={handleRequest} disabled={loading} className="w-full">
                            {loading ? 'Processing...' : 'Request Payout'}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>History</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {payouts.map((p) => (
                                <div key={p.id} className="flex items-center justify-between border-b pb-2 last:border-0 relative">
                                    <div>
                                        <p className="font-medium">${(p.amountCents / 100).toFixed(2)}</p>
                                        <p className="text-sm text-muted-foreground">{p.method}</p>
                                        <p className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${p.status === 'PAID' ? 'bg-green-100 text-green-800' :
                                            p.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                                                'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {p.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {payouts.length === 0 && <p className="text-muted-foreground">No payout history.</p>}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
