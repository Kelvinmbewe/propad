'use client';

import { useState, useEffect } from 'react';
import { getServerApiBaseUrl } from '@propad/config';
import { useSession } from 'next-auth/react';

interface Wallet {
  id: string;
  currency: string;
  balanceCents: number;
  pendingCents: number;
}

interface PayoutRequest {
  id: string;
  amountCents: number;
  method: string;
  status: string;
  createdAt: string;
}

export default function WalletPage() {
  const { data: session } = useSession();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.accessToken) {
      loadWallet();
      loadPayouts();
    }
  }, [session]);

  const loadWallet = async () => {
    try {
      const response = await fetch(`${getServerApiBaseUrl()}/wallets/my`, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setWallet(data[0] || null);
      }
    } catch (error) {
      console.error('Failed to load wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPayouts = async () => {
    try {
      const response = await fetch(`${getServerApiBaseUrl()}/payouts/my`, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPayouts(data);
      }
    } catch (error) {
      console.error('Failed to load payouts:', error);
    }
  };

  if (loading) {
    return <div>Loading wallet...</div>;
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">Wallet</h1>
        <p className="text-sm text-gray-600">Manage your balance and payout requests</p>
      </div>

      {wallet && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Available Balance</h3>
            <p className="mt-2 text-3xl font-bold">
              ${(wallet.balanceCents / 100).toFixed(2)} {wallet.currency}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Pending</h3>
            <p className="mt-2 text-3xl font-bold">
              ${(wallet.pendingCents / 100).toFixed(2)} {wallet.currency}
            </p>
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-4 text-lg font-semibold">Payout Requests</h2>
        {payouts.length === 0 ? (
          <p className="text-sm text-gray-500">No payout requests yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {payouts.map((payout) => (
                  <tr key={payout.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      ${(payout.amountCents / 100).toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {payout.method}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
                        {payout.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(payout.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

