'use client';

import { useState } from 'react';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@propad/ui';
import { ShieldCheck, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';

export default function IntegrityPage() {
    const sdk = useAuthenticatedSDK();
    const [reconcileResult, setReconcileResult] = useState<any>(null);

    const reconcileMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/reconciliation/wallets`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${sdk?.accessToken}` }
            });
            return res.json();
        },
        onSuccess: (data) => {
            setReconcileResult(data);
        }
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">System Integrity</h1>
                    <p className="text-sm text-neutral-500">Monitor and repair data consistency.</p>
                </div>
                <Button
                    onClick={() => reconcileMutation.mutate()}
                    disabled={reconcileMutation.isPending}
                >
                    <RefreshCw className={`mr-2 h-4 w-4 ${reconcileMutation.isPending ? 'animate-spin' : ''}`} />
                    Run Reconciliation
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Wallet Status</CardTitle>
                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Encrypted</div>
                        <p className="text-xs text-neutral-500">Ledger integrity active</p>
                    </CardContent>
                </Card>
            </div>

            {reconcileResult && (
                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader>
                        <CardTitle>Reconciliation Report</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-4 gap-4 text-center">
                            <div className="bg-neutral-50 p-4 rounded-lg">
                                <div className="text-2xl font-bold">{reconcileResult.scanned}</div>
                                <div className="text-xs text-neutral-500">Wallets Scanned</div>
                            </div>
                            <div className="bg-neutral-50 p-4 rounded-lg">
                                <div className={`text-2xl font-bold ${reconcileResult.mismatches > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                    {reconcileResult.mismatches}
                                </div>
                                <div className="text-xs text-neutral-500">Mismatches Found</div>
                            </div>
                            <div className="bg-neutral-50 p-4 rounded-lg">
                                <div className="text-2xl font-bold text-blue-600">{reconcileResult.fixed}</div>
                                <div className="text-xs text-neutral-500">Repaired</div>
                            </div>
                        </div>

                        {reconcileResult.mismatches === 0 ? (
                            <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 p-3 rounded">
                                <CheckCircle className="h-5 w-5" />
                                All wallets are in sync with the ledger.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-amber-700 bg-amber-50 p-3 rounded">
                                    <AlertTriangle className="h-5 w-5" />
                                    Discrepancies detected and repaired.
                                </div>
                                <div className="text-sm border rounded divide-y">
                                    {reconcileResult.details.map((d: any) => (
                                        <div key={d.walletId} className="p-2 flex justify-between">
                                            <span>User {d.userId.substring(0, 8)}...</span>
                                            <span className="font-mono text-red-600">{d.diff > 0 ? '+' : ''}{d.diff / 100}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
