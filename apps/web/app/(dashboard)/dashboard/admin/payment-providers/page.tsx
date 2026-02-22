'use client';

import { useState, useEffect } from 'react';
import { Button, Switch, notify } from '@propad/ui';
import { useSdkClient } from '@/hooks/use-sdk-client';
import { ClientState } from '@/components/client-state';
import { EmptyState } from '@/components/empty-state';
import { AlertTriangle } from 'lucide-react';

const PROVIDERS = [
  { key: 'PAYNOW', label: 'Paynow Zimbabwe' },
  { key: 'STRIPE', label: 'Stripe' },
  { key: 'PAYPAL', label: 'PayPal' }
] as const;

type ProviderKey = (typeof PROVIDERS)[number]['key'];

interface PaymentProvider {
  id?: string;
  provider: ProviderKey;
  enabled: boolean;
  isDefault: boolean;
  isTestMode: boolean;
  validatedAt: string | null;
  apiKey?: string | null;
  apiSecret?: string | null;
  returnUrl?: string | null;
  webhookUrl?: string | null;
  webhookSecret?: string | null;
  configJson?: Record<string, unknown> | null;
}

type ProviderDraft = {
  enabled: boolean;
  isTestMode: boolean;
  apiKey: string;
  apiSecret: string;
  returnUrl: string;
  webhookUrl: string;
  webhookSecret: string;
  configJson: string;
};


export default function PaymentProvidersPage() {
  const { status, message, apiBaseUrl, accessToken } = useSdkClient();
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProvider, setSavingProvider] = useState<ProviderKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<ProviderKey, ProviderDraft>>(() =>
    PROVIDERS.reduce((acc, provider) => {
      acc[provider.key] = {
        enabled: false,
        isTestMode: true,
        apiKey: '',
        apiSecret: '',
        returnUrl: '',
        webhookUrl: '',
        webhookSecret: '',
        configJson: ''
      };
      return acc;
    }, {} as Record<ProviderKey, ProviderDraft>)
  );
  const [jsonErrors, setJsonErrors] = useState<Record<ProviderKey, string | null>>(() =>
    PROVIDERS.reduce((acc, provider) => {
      acc[provider.key] = null;
      return acc;
    }, {} as Record<ProviderKey, string | null>)
  );


  useEffect(() => {
    if (status === 'ready') {
      loadProviders();
    }
  }, [status]);

  const loadProviders = async () => {
    try {
      if (!apiBaseUrl || !accessToken) {
        throw new Error('Missing API configuration');
      }
      setLoading(true);
      setError(null);
      const response = await fetch(`${apiBaseUrl}/payment-providers`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load payment providers');
      }

      const data = await response.json();
      const normalized = mergeProviders(data as PaymentProvider[]);
      setProviders(normalized);
      setDrafts((current) => buildDrafts(normalized, current));
      setJsonErrors((current) =>
        PROVIDERS.reduce((acc, provider) => {
          acc[provider.key] = current[provider.key] ?? null;
          return acc;
        }, {} as Record<ProviderKey, string | null>)
      );

    } catch (error) {
      console.error('Failed to load providers:', error);
      setError('Failed to load payment providers.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (providerKey: ProviderKey) => {
    if (!apiBaseUrl || !accessToken) {
      notify.error('Missing API configuration');
      return;
    }

    setSavingProvider(providerKey);
    setJsonErrors((current) => ({ ...current, [providerKey]: null }));

    let parsedConfig: Record<string, unknown> | undefined;
    const draft = drafts[providerKey];
    if (draft.configJson.trim()) {
      try {
        parsedConfig = JSON.parse(draft.configJson) as Record<string, unknown>;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid JSON payload';
        setJsonErrors((current) => ({ ...current, [providerKey]: message }));
        setSavingProvider(null);
        return;
      }
    }

    try {
      const response = await fetch(`${apiBaseUrl}/payment-providers/${providerKey}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          enabled: draft.enabled,
          isTestMode: draft.isTestMode,
          apiKey: draft.apiKey || undefined,
          apiSecret: draft.apiSecret || undefined,
          returnUrl: draft.returnUrl || undefined,
          webhookUrl: draft.webhookUrl || undefined,
          webhookSecret: draft.webhookSecret || undefined,
          configJson: parsedConfig
        })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const message = body?.message ?? 'Failed to save provider settings';
        notify.error(message);
        return;
      }

      notify.success('Provider settings saved');
      await loadProviders();
    } catch (error) {
      console.error('Failed to save provider:', error);
      notify.error('Unable to save provider settings');
    } finally {
      setSavingProvider(null);
    }
  };


  const handleToggle = async (provider: PaymentProvider) => {
    try {
      if (!apiBaseUrl || !accessToken) {
        throw new Error('Missing API configuration');
      }
      const response = await fetch(
        `${apiBaseUrl}/payment-providers/${provider.provider}/toggle`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
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
      if (!apiBaseUrl || !accessToken) {
        throw new Error('Missing API configuration');
      }
      const response = await fetch(
        `${apiBaseUrl}/payment-providers/${provider.provider}/default`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
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

  const updateDraft = (providerKey: ProviderKey, key: keyof ProviderDraft, value: string | boolean) => {
    setDrafts((current) => ({
      ...current,
      [providerKey]: {
        ...current[providerKey],
        [key]: value
      }
    }));
  };

  const mergeProviders = (data: PaymentProvider[]): PaymentProvider[] => {
    const mapped = new Map(data.map((provider) => [provider.provider, provider]));
    return PROVIDERS.map((provider) =>
      mapped.get(provider.key) ?? {
        provider: provider.key,
        enabled: false,
        isDefault: false,
        isTestMode: true,
        validatedAt: null,
        apiKey: null,
        apiSecret: null,
        returnUrl: null,
        webhookUrl: null,
        webhookSecret: null,
        configJson: null
      }
    );
  };

  const buildDrafts = (
    data: PaymentProvider[],
    previous: Record<ProviderKey, ProviderDraft>
  ): Record<ProviderKey, ProviderDraft> => {
    return data.reduce((acc, provider) => {
      const prior = previous[provider.provider];
      acc[provider.provider] = {
        enabled: provider.enabled,
        isTestMode: provider.isTestMode,
        apiKey: provider.apiKey ?? prior?.apiKey ?? '',
        apiSecret: provider.apiSecret ?? prior?.apiSecret ?? '',
        returnUrl: provider.returnUrl ?? prior?.returnUrl ?? '',
        webhookUrl: provider.webhookUrl ?? prior?.webhookUrl ?? '',
        webhookSecret: provider.webhookSecret ?? prior?.webhookSecret ?? '',
        configJson: provider.configJson
          ? JSON.stringify(provider.configJson, null, 2)
          : prior?.configJson ?? ''
      };
      return acc;
    }, {} as Record<ProviderKey, ProviderDraft>);
  };


  if (status !== 'ready') {
    return <ClientState status={status} message={message} title="Payment providers" />;
  }

  if (loading) {
    return <div className="text-sm text-neutral-500">Loading payment providers…</div>;
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">Payment Providers</h1>
        <p className="text-sm text-gray-600">Configure and manage payment gateway integrations</p>
      </div>

      <div className="grid gap-4">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-600">
            {error}
            <div className="mt-4">
              <Button variant="outline" onClick={loadProviders}>
                Retry
              </Button>
            </div>
          </div>
        ) : providers.length === 0 ? (
          <EmptyState
            title="No providers configured"
            description="You have not connected any payment gateways yet."
            action={
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <AlertTriangle className="h-4 w-4" />
                Configure a provider to start accepting payments.
              </div>
            }
          />
        ) : (
          providers.map((provider) => {
            const draft = drafts[provider.provider];
            const providerLabel = PROVIDERS.find((item) => item.key === provider.provider)?.label;
            if (!draft) {
              return null;
            }
            return (
              <div
                key={provider.provider}
                className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold">{providerLabel ?? provider.provider}</h3>
                      {provider.isDefault && (
                        <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                          Default
                        </span>
                      )}
                      {draft.isTestMode && (
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
                  <div className="flex flex-wrap gap-2">
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

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <div className="space-y-4">
                    <label className="flex items-center justify-between text-sm">
                      <span className="font-medium text-neutral-700">Test mode</span>
                      <Switch
                        checked={draft.isTestMode}
                        onCheckedChange={(checked) => updateDraft(provider.provider, 'isTestMode', checked)}
                      />
                    </label>

                    <label className="flex flex-col gap-1 text-sm">
                      <span className="font-medium text-neutral-700">API key</span>
                      <input
                        type="text"
                        value={draft.apiKey}
                        onChange={(event) => updateDraft(provider.provider, 'apiKey', event.target.value)}
                        className="rounded-md border border-neutral-300 px-3 py-2"
                        placeholder="Enter API key"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="font-medium text-neutral-700">API secret</span>
                      <input
                        type="password"
                        value={draft.apiSecret}
                        onChange={(event) => updateDraft(provider.provider, 'apiSecret', event.target.value)}
                        className="rounded-md border border-neutral-300 px-3 py-2"
                        placeholder="Enter API secret"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="font-medium text-neutral-700">Return URL</span>
                      <input
                        type="url"
                        value={draft.returnUrl}
                        onChange={(event) => updateDraft(provider.provider, 'returnUrl', event.target.value)}
                        className="rounded-md border border-neutral-300 px-3 py-2"
                        placeholder="https://your-domain/return"
                      />
                    </label>
                  </div>

                  <div className="space-y-4">
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="font-medium text-neutral-700">Webhook URL</span>
                      <input
                        type="url"
                        value={draft.webhookUrl}
                        onChange={(event) => updateDraft(provider.provider, 'webhookUrl', event.target.value)}
                        className="rounded-md border border-neutral-300 px-3 py-2"
                        placeholder="https://your-domain/webhooks"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="font-medium text-neutral-700">Webhook secret</span>
                      <input
                        type="password"
                        value={draft.webhookSecret}
                        onChange={(event) => updateDraft(provider.provider, 'webhookSecret', event.target.value)}
                        className="rounded-md border border-neutral-300 px-3 py-2"
                        placeholder="Webhook secret"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="font-medium text-neutral-700">Extra config (JSON)</span>
                      <textarea
                        value={draft.configJson}
                        onChange={(event) => updateDraft(provider.provider, 'configJson', event.target.value)}
                        rows={5}
                        className="rounded-md border border-neutral-300 px-3 py-2 font-mono text-xs"
                        placeholder='{"key": "value"}'
                      />
                    </label>
                    {jsonErrors[provider.provider] && (
                      <p className="text-xs text-red-600">{jsonErrors[provider.provider]}</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={() => handleSave(provider.provider)}
                    disabled={savingProvider === provider.provider}
                  >
                    {savingProvider === provider.provider ? 'Saving…' : 'Save settings'}
                  </Button>
                </div>
              </div>
            );
          })
        )}

      </div>
    </div>
  );
}
