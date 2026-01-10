'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sdk } from '@propad/sdk';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    Button,
    Input,
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    useToast
} from '@propad/ui';
import { Loader2, Plus, Wallet } from 'lucide-react';

export function WithdrawDialog() {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<'SELECT_ACCOUNT' | 'ADD_ACCOUNT'>('SELECT_ACCOUNT');
    const [amount, setAmount] = useState('');
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');

    // Add Account Form State
    const [newAccountType, setNewAccountType] = useState('BANK');
    const [newAccountName, setNewAccountName] = useState('');
    const [bankName, setBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');

    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: accounts, isLoading: isLoadingAccounts } = useQuery({
        queryKey: ['payout-accounts'],
        queryFn: () => sdk.payouts.getAccounts(),
        enabled: open
    });

    const { data: walletOverview } = useQuery({
        queryKey: ['wallet-overview'],
        queryFn: () => sdk.wallet.getOverview(),
        enabled: open
    });

    const createAccountMutation = useMutation({
        mutationFn: (data: { type: string; displayName: string; details: any }) =>
            sdk.payouts.createAccount(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payout-accounts'] });
            setStep('SELECT_ACCOUNT');
            toast({ title: 'Account Added', description: 'Payout account successfully added.' });
        },
        onError: (error: any) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    });

    const requestPayoutMutation = useMutation({
        mutationFn: (data: { amountCents: number; method: string; accountId: string }) =>
            sdk.payouts.request(data),
        onSuccess: () => {
            setOpen(false);
            queryClient.invalidateQueries({ queryKey: ['wallet-overview'] });
            queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
            toast({ title: 'Payout Requested', description: 'Your payout request has been submitted for approval.' });
            // Reset form
            setAmount('');
            setSelectedAccountId('');
        },
        onError: (error: any) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    });

    const handleAddAccount = () => {
        let details: any = {};
        if (newAccountType === 'BANK') {
            details = { bankName, accountNumber, accountName: newAccountName };
        } else {
            details = { mobileNumber };
        }

        createAccountMutation.mutate({
            type: newAccountType,
            displayName: newAccountName || mobileNumber || 'My Account',
            details
        });
    };

    const handleRequestPayout = () => {
        if (!amount || isNaN(Number(amount))) return;
        if (!selectedAccountId) return;

        // Find account to get method
        const account = accounts?.find(a => a.id === selectedAccountId);
        if (!account) return;

        requestPayoutMutation.mutate({
            amountCents: Math.round(Number(amount) * 100),
            method: account.type, // Assuming type matches PayoutMethod (BANK, ECOCASH, MOBILE_MONEY)
            accountId: selectedAccountId
        });
    };

    const maxWithdrawable = (walletOverview?.withdrawableCents || 0) / 100;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Wallet className="mr-2 h-4 w-4" />
                    Request Payout
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{step === 'ADD_ACCOUNT' ? 'Add Payout Account' : 'Request Payout'}</DialogTitle>
                    <DialogDescription>
                        {step === 'ADD_ACCOUNT'
                            ? 'Enter your account details to receive payouts.'
                            : 'Select an account and enter amount to withdraw.'}
                    </DialogDescription>
                </DialogHeader>

                {step === 'SELECT_ACCOUNT' ? (
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Withdrawable Balance</Label>
                            <div className="text-2xl font-bold text-green-600">
                                ${maxWithdrawable.toFixed(2)}
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>Payout Account</Label>
                            {isLoadingAccounts ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Select value={selectedAccountId} onValueChange={(val) => {
                                    if (val === 'new') {
                                        setStep('ADD_ACCOUNT');
                                        setSelectedAccountId('');
                                    } else {
                                        setSelectedAccountId(val);
                                    }
                                }}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select account" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {accounts?.map((acc) => (
                                            <SelectItem key={acc.id} value={acc.id}>
                                                {acc.displayName} ({acc.type})
                                            </SelectItem>
                                        ))}
                                        <SelectItem value="new">
                                            <div className="flex items-center text-primary">
                                                <Plus className="mr-2 h-4 w-4" /> Add New Account
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="amount">Amount (USD)</Label>
                            <Input
                                id="amount"
                                type="number"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                max={maxWithdrawable}
                            />
                            <div className="text-xs text-muted-foreground">
                                Minimum payout: $10.00
                            </div>
                        </div>

                        <Button
                            onClick={handleRequestPayout}
                            disabled={!selectedAccountId || !amount || Number(amount) <= 0 || requestPayoutMutation.isPending}
                        >
                            {requestPayoutMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit Request
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-4 py-4">
                        {/* Add Account Form */}
                        <div className="grid gap-2">
                            <Label>Account Type</Label>
                            <Select value={newAccountType} onValueChange={setNewAccountType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="BANK">Bank Transfer</SelectItem>
                                    <SelectItem value="ECOCASH">EcoCash</SelectItem>
                                    <SelectItem value="MOBILE_MONEY">Other Mobile Money</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label>Display Name (e.g. My Savings)</Label>
                            <Input value={newAccountName} onChange={e => setNewAccountName(e.target.value)} placeholder="My Main Account" />
                        </div>

                        {newAccountType === 'BANK' ? (
                            <>
                                <div className="grid gap-2">
                                    <Label>Bank Name</Label>
                                    <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. CABS, CBZ" />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Account Number</Label>
                                    <Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="Account Number" />
                                </div>
                            </>
                        ) : (
                            <div className="grid gap-2">
                                <Label>Mobile Number</Label>
                                <Input value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} placeholder="+263..." />
                            </div>
                        )}

                        <div className="flex gap-2 justify-end mt-4">
                            <Button variant="outline" onClick={() => setStep('SELECT_ACCOUNT')}>Cancel</Button>
                            <Button onClick={handleAddAccount} disabled={createAccountMutation.isPending}>
                                {createAccountMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Account
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
