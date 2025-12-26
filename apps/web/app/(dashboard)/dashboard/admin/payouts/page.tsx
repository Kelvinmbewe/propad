'use client';

import { useState, useEffect } from 'react';
import { getServerApiBaseUrl } from '@propad/config';

interface PayoutRequest {
  id: string;
  amountCents: number;
  method: 'ECOCASH' | 'BANK' | 'WALLET';
  status: string;
  createdAt: string;
  wallet: {
    ownerType: string;
    ownerId: string;
    currency: string;
  };
  payoutAccount: {
    displayName: string;
    type: string;
  };
}

export default function PayoutsManagementPage() {
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayouts();
  }, []);

  const loadPayouts = async () => {
    try {
      const response = await fetch(`${getServerApiBaseUrl()}/payouts/pending`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('apiToken')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPayouts(data);
      }
    } catch (error) {
      console.error('Failed to load payouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch(`${getServerApiBaseUrl()}/payouts/${id}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('apiToken')}`
        }
      });
      if (response.ok) {
        loadPayouts();
      }
    } catch (error) {
      console.error('Failed to approve payout:', error);
    }
  };

  const handleReject = async (id: string, reason: string) => {
    try {
      const response = await fetch(`${getServerApiBaseUrl()}/payouts/${id}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('apiToken')}`
        },
        body: JSON.stringify({ reason })
      });
      if (response.ok) {
        loadPayouts();
      }
    } catch (error) {
      console.error('Failed to reject payout:', error);
    }
  };

  if (loading) {
    return <div>Loading payouts...</div>;
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">Payout Management</h1>
        <p className="text-sm text-gray-600">Review and approve payout requests</p>
      </div>

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
                Account
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {payouts.map((payout) => (
              <tr key={payout.id}>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                  ${(payout.amountCents / 100).toFixed(2)} {payout.wallet.currency}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {payout.method}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {payout.payoutAccount.displayName}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
                    {payout.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {new Date(payout.createdAt).toLocaleDateString()}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(payout.id)}
                      className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(payout.id, 'Rejected by admin')}
                      className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

