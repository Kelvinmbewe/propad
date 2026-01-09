'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Skeleton, Button } from '@propad/ui';
import { WalletSummary } from '@/components/wallet-summary';
import { PaymentHistory } from '@/components/payment-history';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';
import { useSession } from 'next-auth/react';
import { formatCurrency } from '@/lib/formatters';
import { DollarSign, Clock, CheckCircle2, XCircle } from 'lucide-react';

interface PayoutRequest {
  id: string;
  amountCents: number;
  method: string;
  status: string;
  createdAt: string;
  txRef?: string;
}

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

  const handleRequestPayout = async () => {
    // In a real app, this would open a Dialog with form
    const amount = prompt("Enter amount to withdraw (USD):");
    if (!amount) return;

    try {
      await sdk.payouts.requestPayout({
        amountCents: Math.floor(parseFloat(amount) * 100),
        method: 'BANK_TRANSFER', // Hardcoded for Demo
        accountId: 'demo-account-id'
      });
      alert("Payout requested successfully!");
      window.location.reload(); // Simple refresh to see new state
    } catch (e) {
      console.error(e);
      alert("Failed to request payout. Ensure you have balance and valid account.");
    }
  };

  const { data: payouts, isLoading: loadingPayouts } = useQuery<PayoutRequest[]>({
    queryKey: ['payouts-my'],
    queryFn: async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/payouts/my`, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to load payouts');
      }
      return response.json();
    },
    enabled: !!sdk
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">Wallet</h1>
        <p className="text-sm text-gray-600">Manage your balance, payouts, and payment history</p>
      </div>

      <div className="flex items-center justify-between">
        <WalletSummary />
        <Button onClick={() => handleRequestPayout()}>Request Payout</Button>
      </div>

      {/* Payout Dialog Placeholder - Ideally a modal component */}

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
          <div className="flex flex-col gap-6"> {/* Added a div to wrap the two cards in the second column */}
            <Card>
              <CardHeader>
                <CardTitle>Minimum Payout Threshold</CardTitle>
                <CardDescription>Amount required to request a payout</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-2xl font-bold">$10.00 USD</p>
                    <p className="text-xs text-gray-500">Minimum amount to withdraw</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Redeem Promo Code</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter code (e.g. WELCOME10)"
                    id="promoCodeInput"
                  />
                  <Button onClick={async () => {
                    const input = document.getElementById('promoCodeInput') as HTMLInputElement;
                    if (!input.value) return;
                    try {
                      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/growth/promos/redeem`, {
                        method: 'POST',
                        headers: {
                          Authorization: `Bearer ${sdk?.accessToken}`,
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ code: input.value })
                      });
                      const json = await res.json();
                      if (res.ok) {
                        alert(json.message);
                        queryClient.invalidateQueries({ queryKey: ['wallet'] });
                        input.value = '';
                      } else {
                        alert(json.message || 'Failed to redeem');
                      }
                    } catch (e) {
                      alert('Error redeeming code');
                    }
                  }}>Apply</Button>
                </div>
              </CardContent>
            </Card>
          </div>
      </div>

      <PaymentHistory />
    </div>
  );
}

