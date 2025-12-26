'use client';

import { useState, useEffect } from 'react';
import { getServerApiBaseUrl } from '@propad/config';
import { useSession } from 'next-auth/react';

interface ReferralEarning {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  sourceType: string;
  createdAt: string;
}

interface ReferralSummary {
  totalEarned: number;
  pending: number;
  paid: number;
  count: number;
}

export default function ReferralsPage() {
  const { data: session } = useSession();
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [earnings, setEarnings] = useState<ReferralEarning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.accessToken) {
      loadSummary();
      loadEarnings();
    }
  }, [session]);

  const loadSummary = async () => {
    try {
      const response = await fetch(`${getServerApiBaseUrl()}/referrals/earnings/summary`, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (error) {
      console.error('Failed to load summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEarnings = async () => {
    try {
      const response = await fetch(`${getServerApiBaseUrl()}/referrals/earnings`, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setEarnings(data);
      }
    } catch (error) {
      console.error('Failed to load earnings:', error);
    }
  };

  if (loading) {
    return <div>Loading referral earnings...</div>;
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">Referral Earnings</h1>
        <p className="text-sm text-gray-600">Track your referral commissions</p>
      </div>

      {summary && (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Total Earned</h3>
            <p className="mt-2 text-3xl font-bold">${(summary.totalEarned / 100).toFixed(2)}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Pending</h3>
            <p className="mt-2 text-3xl font-bold">${(summary.pending / 100).toFixed(2)}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Paid</h3>
            <p className="mt-2 text-3xl font-bold">${(summary.paid / 100).toFixed(2)}</p>
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-4 text-lg font-semibold">Earnings History</h2>
        {earnings.length === 0 ? (
          <p className="text-sm text-gray-500">No referral earnings yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {earnings.map((earning) => (
                  <tr key={earning.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      ${(earning.amountCents / 100).toFixed(2)} {earning.currency}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {earning.sourceType}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          earning.status === 'PAID'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {earning.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(earning.createdAt).toLocaleDateString()}
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

