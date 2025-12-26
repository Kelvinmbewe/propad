'use client';

import { useState, useEffect } from 'react';
import { getServerApiBaseUrl } from '@propad/config';

interface PricingRule {
  id: string;
  itemType: string;
  priceUsdCents: number;
  currency: 'USD' | 'ZWG';
  commissionPercent: number;
  platformFeePercent: number;
  agentSharePercent: number | null;
  referralSharePercent: number | null;
  rewardPoolSharePercent: number | null;
  isActive: boolean;
}

export default function PricingPage() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      const response = await fetch(`${getServerApiBaseUrl()}/pricing`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('apiToken')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setRules(data);
      }
    } catch (error) {
      console.error('Failed to load pricing rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatItemType = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  if (loading) {
    return <div>Loading pricing rules...</div>;
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">Pricing & Fees</h1>
        <p className="text-sm text-gray-600">Configure pricing rules for chargeable items</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Item Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Commission
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Platform Fee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Agent Share
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Referral Share
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Reward Pool
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {rules.map((rule) => (
              <tr key={rule.id}>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                  {formatItemType(rule.itemType)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  ${(rule.priceUsdCents / 100).toFixed(2)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {rule.commissionPercent}%
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {rule.platformFeePercent}%
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {rule.agentSharePercent ? `${rule.agentSharePercent}%` : '-'}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {rule.referralSharePercent ? `${rule.referralSharePercent}%` : '-'}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {rule.rewardPoolSharePercent ? `${rule.rewardPoolSharePercent}%` : '-'}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      rule.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {rule.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

