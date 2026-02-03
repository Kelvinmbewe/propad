'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Skeleton, Button, Input, Tabs, TabsContent, TabsList, TabsTrigger } from '@propad/ui';
import { useSession } from 'next-auth/react';
import { WalletSummary } from '@/components/wallet-summary';
import { PaymentHistory } from '@/components/payment-history';
import { LedgerTable } from '@/components/ledger-table';
import { RewardsHistory } from '@/components/rewards-history';
import { ReferralDashboard } from '@/components/referral-dashboard';
import { WithdrawDialog } from '@/components/withdraw-dialog';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';
import { formatCurrency } from '@/lib/formatters';
import { DollarSign, Clock, CheckCircle2, XCircle } from 'lucide-react';
import type { PayoutRequest } from '@propad/sdk';
import { getRequiredPublicApiBaseUrl } from '@/lib/api-base-url';



const getStatusBadge = (status: string) => {
  switch (status) {
    case 'PAID':
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Paid
        </Badge>
      );
    case 'PROCESSING':
    case 'APPROVED':
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          <Clock className="mr-1 h-3 w-3" />
          {status}
        </Badge>
      );
    case 'FAILED':
    case 'CANCELLED':
      return (
        <Badge variant="secondary" className="bg-red-100 text-red-800">
          <XCircle className="mr-1 h-3 w-3" />
          {status}
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default function WalletPage() {
  const sdk = useAuthenticatedSDK();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const apiBaseUrl = getRequiredPublicApiBaseUrl();
  const role = (session?.user as any)?.role;

  if (role === 'ADVERTISER') {
    return <AdvertiserWallet />;
  }

  const handleRequestPayout = async () => {
    // In a real app, this would open a Dialog with form
    const amount = prompt("Enter amount to withdraw (USD):");
    if (!amount) return;

    try {
      if (!sdk) return;
      await sdk.payouts.request({
        amountCents: Math.floor(parseFloat(amount) * 100),
        method: 'BANK', // Default for now
        accountId: 'demo-account-id', // TODO: User needs to select account
      });
      alert("Payout requested successfully!");
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert("Failed to request payout. Ensure you have balance and valid account.");
    }
  };

  const { data: payouts, isLoading: loadingPayouts } = useQuery<PayoutRequest[]>({
    queryKey: ['payouts-my'],
    queryFn: async () => {
      return sdk!.payouts.my();
    },
    enabled: !!sdk
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Wallet</h1>
          <WithdrawDialog />
        </div>
        <p className="text-sm text-gray-600">Manage your balance, payouts, and payment history</p>
      </div>

      <WalletSummary />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="ledger">Ledger / Transactions</TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="flex items-center justify-end">
            <Button onClick={() => handleRequestPayout()}>Request Payout</Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Payout Requests</CardTitle>
                <CardDescription>Track your withdrawal requests</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingPayouts ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between border-b pb-4">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    ))}
                  </div>
                ) : !payouts || payouts.length === 0 ? (
                  <div className="py-12 text-center text-sm text-gray-500 flex flex-col items-center">
                    <div className="h-10 w-10 bg-gray-50 rounded-full flex items-center justify-center mb-2">
                      <Clock className="h-5 w-5 text-gray-300" />
                    </div>
                    No payout requests found
                  </div>
                ) : (
                  <div className="space-y-4">
                    {payouts.map((payout) => (
                      <div key={payout.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                        <div>
                          <p className="font-medium text-gray-900">
                            {formatCurrency(payout.amountCents / 100, 'USD')}
                          </p>
                          <p className="text-xs text-gray-500">
                            {payout.method} • {new Date(payout.createdAt).toLocaleDateString()}
                          </p>
                          {payout.txRef && (
                            <p className="text-xs text-gray-400">Ref: {payout.txRef.substring(0, 12)}...</p>
                          )}
                        </div>
                        {getStatusBadge(payout.status)}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Minimum Payout Threshold</CardTitle>
                <CardDescription>Amount required to request a payout</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-2xl font-bold">$10.00 USD</p>
                    <p className="text-xs text-gray-500">Minimum amount to withdraw</p>
                  </div>
                </div>

                <div className="pt-6 border-t">
                  <h4 className="text-sm font-medium mb-4">Redeem Promo Code</h4>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter code (e.g. WELCOME10)"
                      id="promoCodeInput"
                    />
                    <Button onClick={async () => {
                      const input = document.getElementById('promoCodeInput') as HTMLInputElement;
                      if (!input.value) return;
                      try {
                        const res = await fetch(`${apiBaseUrl}/growth/promos/redeem`, {
                          method: 'POST',
                          headers: {
                            Authorization: `Bearer ${session?.accessToken}`,
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({ code: input.value })
                        });
                        const json = await res.json();
                        if (res.ok) {
                          alert(json.message);
                          input.value = '';
                        } else {
                          alert(json.message || 'Failed to redeem');
                        }
                      } catch (e) {
                        alert('Error redeeming code');
                      }
                    }}>Apply</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rewards">
          <RewardsHistory />
        </TabsContent>

        <TabsContent value="referrals">
          <ReferralDashboard />
        </TabsContent>

        <TabsContent value="ledger">
          <LedgerTable />
        </TabsContent>

        <TabsContent value="history">
          <PaymentHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AdvertiserWallet() {
  const sdk = useAuthenticatedSDK();
  const queryClient = useQueryClient();
  const [topUpAmount, setTopUpAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [reversalAmount, setReversalAmount] = useState('');
  const [selectedGateway, setSelectedGateway] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const advertiserQuery = useQuery({
    queryKey: ['ads-advertiser'],
    enabled: !!sdk,
    queryFn: async () => sdk!.ads.getAdvertiser(),
  });

  const balanceQuery = useQuery({
    queryKey: ['ads-balance'],
    enabled: !!sdk,
    queryFn: async () => sdk!.ads.getBalance(),
  });

  const gatewaysQuery = useQuery({
    queryKey: ['payment-gateways-enabled'],
    enabled: !!sdk,
    queryFn: async () => sdk!.paymentProviders.getEnabledGateways(),
  });

  const advertiser = advertiserQuery.data;
  const balanceCents = balanceQuery.data?.balanceCents ?? 0;
  const gateways = gatewaysQuery.data ?? [];
  const shouldChooseGateway = gateways.length > 1;
  const gatewayChoice = selectedGateway || gateways[0];

  const handleTopUp = async () => {
    if (!sdk || !advertiser?.id) return;
    const amount = parseFloat(topUpAmount);
    if (!amount || amount <= 0) {
      setStatusMessage('Enter a valid top up amount.');
      return;
    }

    if (!gatewayChoice) {
      setStatusMessage('Select a payment gateway to continue.');
      return;
    }

    if (gatewayChoice === 'OFFLINE') {
      setStatusMessage('No payment gateways are enabled right now.');
      return;
    }

    try {
      const response = await sdk.ads.createTopupIntent({
        amountCents: Math.round(amount * 100),
        gateway: gatewayChoice,
        returnUrl: window.location.origin + '/dashboard/wallet',
      });
      setTopUpAmount('');
      if (response?.redirectUrl) {
        window.location.href = response.redirectUrl;
      } else {
        setStatusMessage('Unable to start payment. Please try again.');
      }
    } catch (error: any) {
      setStatusMessage(error?.message || 'Failed to top up advertiser balance.');
    }
  };

  const handleWithdrawalRequest = async () => {
    if (!sdk) return;
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      setStatusMessage('Enter a valid withdrawal amount.');
      return;
    }

    if (Math.round(amount * 100) > balanceCents) {
      setStatusMessage('Withdrawal amount exceeds your available balance.');
      return;
    }

    try {
      await sdk.ads.requestWithdrawal({
        amountCents: Math.round(amount * 100),
        reason: 'Advertiser withdrawal request',
      });
      setWithdrawAmount('');
      setStatusMessage('Withdrawal request submitted.');
    } catch (error: any) {
      setStatusMessage(error?.message || 'Failed to submit withdrawal request.');
    }
  };

  const handleReversalRequest = async () => {
    if (!sdk) return;
    const amount = parseFloat(reversalAmount);
    if (!amount || amount <= 0) {
      setStatusMessage('Enter a valid reversal amount.');
      return;
    }

    if (Math.round(amount * 100) > balanceCents) {
      setStatusMessage('Reversal amount exceeds your available balance.');
      return;
    }

    try {
      await sdk.ads.requestWithdrawalReversal({
        amountCents: Math.round(amount * 100),
        reason: 'Advertiser reversal request',
      });
      setReversalAmount('');
      setStatusMessage('Reversal request submitted.');
    } catch (error: any) {
      setStatusMessage(error?.message || 'Failed to submit reversal request.');
    }
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Advertiser Wallet</h1>
        <p className="text-sm text-gray-600">Manage ad credits, withdrawals, and reversals.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Advertiser Balance</CardTitle>
            <CardDescription>Available ad credit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(balanceCents / 100, 'USD')}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Advertiser: {advertiser?.name ?? 'Unknown'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Up</CardTitle>
            <CardDescription>Add ad credit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {shouldChooseGateway && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600">Payment gateway</label>
                <select
                  value={selectedGateway}
                  onChange={(event) => setSelectedGateway(event.target.value)}
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Select gateway</option>
                  {gateways.map((gateway: any) => (
                    <option key={gateway} value={gateway}>
                      {gateway}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <Input
              value={topUpAmount}
              onChange={(event) => setTopUpAmount(event.target.value)}
              placeholder="Amount (USD)"
              type="number"
              min="0"
              step="0.01"
            />
            <Button onClick={handleTopUp} disabled={!sdk || advertiserQuery.isLoading}>
              Submit Top Up
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Requests</CardTitle>
            <CardDescription>Withdrawals & reversals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={withdrawAmount}
              onChange={(event) => setWithdrawAmount(event.target.value)}
              placeholder="Withdrawal amount (USD)"
              type="number"
              min="0"
              step="0.01"
            />
            <Button variant="outline" onClick={handleWithdrawalRequest} disabled={!sdk}>
              Request Withdrawal
            </Button>
            <Input
              value={reversalAmount}
              onChange={(event) => setReversalAmount(event.target.value)}
              placeholder="Reversal amount (USD)"
              type="number"
              min="0"
              step="0.01"
            />
            <Button variant="outline" onClick={handleReversalRequest} disabled={!sdk}>
              Request Reversal
            </Button>
          </CardContent>
        </Card>
      </div>

      {statusMessage && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          {statusMessage}
        </div>
      )}
    </div>
  );
}
