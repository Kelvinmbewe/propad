'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from '@propad/ui';
import { formatCurrency } from '@/lib/formatters';
import { Wallet, TrendingUp, Clock, DollarSign } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface WalletData {
  balanceCents: number;
  pendingCents: number;
  withdrawableCents: number;
  currency: string;
}

export function WalletSummary() {
  const { data: session } = useSession();

  const { data: wallet, isLoading } = useQuery<WalletData>({
    queryKey: ['wallet-me'],
    queryFn: async () => {
      const token = session?.accessToken;
      if (!token) throw new Error('Not authenticated');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/wallet/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to load wallet');
      }
      return response.json();
    },
    enabled: !!session?.accessToken
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!wallet) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-gray-500">Unable to load wallet information</p>
        </CardContent>
      </Card>
    );
  }

  const balance = wallet.balanceCents / 100;
  const pending = wallet.pendingCents / 100;
  const withdrawable = wallet.withdrawableCents / 100;
  const currency = wallet.currency;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(balance, currency)}</div>
          <p className="text-xs text-muted-foreground">
            Total earnings (includes locked funds in pending payouts)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Locked (Pending)</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(pending, currency)}</div>
          <p className="text-xs text-muted-foreground">
            Funds locked in processing payouts (cannot be withdrawn)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Withdrawable</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(withdrawable, currency)}</div>
          <p className="text-xs text-muted-foreground">
            Available to withdraw now (balance minus locked funds)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

