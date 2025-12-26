'use client';

import { useState, useEffect } from 'react';
import { getServerApiBaseUrl } from '@propad/config';

interface PaymentProvider {
  id: string;
  provider: 'PAYNOW' | 'PAYPAL' | 'STRIPE';
  enabled: boolean;
  isDefault: boolean;
  isTestMode: boolean;
  validatedAt: string | null;
}

export default function PaymentProvidersPage() {
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<PaymentProvider>>({});

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      const response = await fetch(`${getServerApiBaseUrl()}/payment-providers`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('apiToken')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setProviders(data);
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (provider: PaymentProvider) => {
    try {
      const response = await fetch(
        `${getServerApiBaseUrl()}/payment-providers/${provider.provider}/toggle`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('apiToken')}`
          },
          body: JSON.stringify({ enabled: !provider.enabled })
        }
      );
      if (response.ok) {
        loadProviders();
      }
    } catch (error) {
      console.error('Failed to toggle provider:', error);
    }
  };

  const handleSetDefault = async (provider: PaymentProvider) => {
    try {
      const response = await fetch(
        `${getServerApiBaseUrl()}/payment-providers/${provider.provider}/default`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('apiToken')}`
          }
        }
      );
      if (response.ok) {
        loadProviders();
      }
    } catch (error) {
      console.error('Failed to set default:', error);
    }
  };

  if (loading) {
    return <div>Loading payment providers...</div>;
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">Payment Providers</h1>
        <p className="text-sm text-gray-600">Configure and manage payment gateway integrations</p>
      </div>

      <div className="grid gap-4">
        {providers.map((provider) => (
          <div
            key={provider.id}
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold">{provider.provider}</h3>
                  {provider.isDefault && (
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                      Default
                    </span>
                  )}
                  {provider.isTestMode && (
                    <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
                      Test Mode
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      provider.enabled
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {provider.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                {provider.validatedAt && (
                  <p className="mt-1 text-sm text-gray-500">
                    Validated: {new Date(provider.validatedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {!provider.isDefault && provider.enabled && (
                  <button
                    onClick={() => handleSetDefault(provider)}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Set Default
                  </button>
                )}
                <button
                  onClick={() => handleToggle(provider)}
                  className={`rounded-md px-4 py-2 text-sm font-medium ${
                    provider.enabled
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {provider.enabled ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

