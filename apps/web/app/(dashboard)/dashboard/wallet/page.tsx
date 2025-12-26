'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Skeleton } from '@propad/ui';
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

      <WalletSummary />

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
              <div className="py-8 text-center text-sm text-gray-500">No payout requests yet</div>
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
      </div>

      <PaymentHistory />
    </div>
  );
}

