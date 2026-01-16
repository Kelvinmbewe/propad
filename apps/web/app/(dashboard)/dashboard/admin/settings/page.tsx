'use client';

import { useEffect, useMemo, useState } from 'react';
import { notify, Switch, Button } from '@propad/ui';
import { useSdkClient } from '@/hooks/use-sdk-client';
import { ClientState } from '@/components/client-state';

const CURRENCY_OPTIONS = ['USD', 'ZWG'];

type Currency = 'USD' | 'ZWG';

type BillingSettings = {
  taxEnabled: boolean;
  taxRate: number;
  labels: {
    invoiceTitle: string;
    receiptTitle: string;
    taxLabel: string;
  };
  currency: {
    defaultCurrency: Currency;
    supportedCurrencies: Currency[];
    allowManualFxRates: boolean;
    fxBase: Currency;
  };
};

type AppConfig = {
  billing: BillingSettings;
};

const EMPTY_CONFIG: AppConfig = {
  billing: {
    taxEnabled: false,
    taxRate: 15,
    labels: {
      invoiceTitle: 'Propad Tax Invoice',
      receiptTitle: 'Propad Payment Receipt',
      taxLabel: 'VAT'
    },
    currency: {
      defaultCurrency: 'USD',
      supportedCurrencies: ['USD'],
      allowManualFxRates: true,
      fxBase: 'USD'
    }
  }
};

export default function SettingsPage() {
  const { status, message, apiBaseUrl, accessToken } = useSdkClient();
  const [config, setConfig] = useState<AppConfig>(EMPTY_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'ready') {
      loadConfig();
    }
  }, [status]);

  const loadConfig = async () => {
    if (!apiBaseUrl || !accessToken) {
      setError('Missing API configuration');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${apiBaseUrl}/admin/config`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load settings');
      }

      const data = (await response.json()) as AppConfig;
      setConfig({ billing: data.billing });
    } catch (error) {
      console.error('Failed to load settings:', error);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const isValid = useMemo(() => {
    const { billing } = config;
    if (!billing.labels.invoiceTitle || !billing.labels.receiptTitle || !billing.labels.taxLabel) {
      return false;
    }
    if (billing.taxRate < 0 || billing.taxRate > 100) {
      return false;
    }
    if (!billing.currency.supportedCurrencies.length) {
      return false;
    }
    if (!billing.currency.supportedCurrencies.includes(billing.currency.defaultCurrency)) {
      return false;
    }
    if (!billing.currency.supportedCurrencies.includes(billing.currency.fxBase)) {
      return false;
    }
    return true;
  }, [config]);

  const handleSave = async () => {
    if (!apiBaseUrl || !accessToken) {
      notify.error('Missing API configuration');
      return;
    }

    if (!isValid) {
      notify.error('Please fix validation errors');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`${apiBaseUrl}/admin/config`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ config })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        notify.error(body?.message ?? 'Failed to save settings');
        return;
      }

      notify.success('Settings updated');
      await loadConfig();
    } catch (error) {
      console.error('Failed to save settings:', error);
      notify.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateBilling = <K extends keyof BillingSettings>(key: K, value: BillingSettings[K]) => {
    setConfig((current) => ({
      ...current,
      billing: {
        ...current.billing,
        [key]: value
      }
    }));
  };

  const updateBillingLabel = (key: keyof BillingSettings['labels'], value: string) => {
    setConfig((current) => ({
      ...current,
      billing: {
        ...current.billing,
        labels: {
          ...current.billing.labels,
          [key]: value
        }
      }
    }));
  };

  const toggleSupportedCurrency = (currency: Currency) => {
    setConfig((current) => {
      const existing = current.billing.currency.supportedCurrencies;
      const next = existing.includes(currency)
        ? existing.filter((item) => item !== currency)
        : [...existing, currency];

      const defaultCurrency = next.includes(current.billing.currency.defaultCurrency)
        ? current.billing.currency.defaultCurrency
        : next[0] ?? 'USD';
      const fxBase = next.includes(current.billing.currency.fxBase)
        ? current.billing.currency.fxBase
        : next[0] ?? 'USD';

      return {
        ...current,
        billing: {
          ...current.billing,
          currency: {
            ...current.billing.currency,
            supportedCurrencies: next,
            defaultCurrency,
            fxBase
          }
        }
      };
    });
  };

  if (status !== 'ready') {
    return <ClientState status={status} message={message} title="Settings" />;
  }

  if (loading) {
    return <p className="text-sm text-neutral-500">Loading settings…</p>;
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-neutral-900">Settings</h1>
        <p className="text-sm text-neutral-500">Manage billing, tax, and currency defaults.</p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <section className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Tax & invoices</h2>
          <p className="text-sm text-neutral-500">Configure tax handling and invoice labels.</p>
        </div>

        <label className="flex items-center justify-between text-sm">
          <span className="font-medium text-neutral-700">Apply tax on invoices</span>
          <Switch
            checked={config.billing.taxEnabled}
            onCheckedChange={(checked) => updateBilling('taxEnabled', checked)}
          />
        </label>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">Tax rate (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={config.billing.taxRate}
              onChange={(event) => updateBilling('taxRate', Number(event.target.value))}
              className="rounded-md border border-neutral-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">Invoice title</span>
            <input
              type="text"
              value={config.billing.labels.invoiceTitle}
              onChange={(event) => updateBillingLabel('invoiceTitle', event.target.value)}
              className="rounded-md border border-neutral-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">Receipt title</span>
            <input
              type="text"
              value={config.billing.labels.receiptTitle}
              onChange={(event) => updateBillingLabel('receiptTitle', event.target.value)}
              className="rounded-md border border-neutral-300 px-3 py-2"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Tax label</span>
          <input
            type="text"
            value={config.billing.labels.taxLabel}
            onChange={(event) => updateBillingLabel('taxLabel', event.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2"
          />
        </label>
      </section>

      <section className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Currency & FX</h2>
          <p className="text-sm text-neutral-500">Manage default currency and FX controls.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">Default currency</span>
            <select
              value={config.billing.currency.defaultCurrency}
              onChange={(event) => updateBilling('currency', {
                ...config.billing.currency,
                defaultCurrency: event.target.value as Currency
              })}
              className="rounded-md border border-neutral-300 px-3 py-2"
            >
              {config.billing.currency.supportedCurrencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">FX base currency</span>
            <select
              value={config.billing.currency.fxBase}
              onChange={(event) => updateBilling('currency', {
                ...config.billing.currency,
                fxBase: event.target.value as Currency
              })}
              className="rounded-md border border-neutral-300 px-3 py-2"
            >
              {config.billing.currency.supportedCurrencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-neutral-700">Supported currencies</span>
            <div className="flex flex-wrap gap-2">
              {CURRENCY_OPTIONS.map((currency) => (
                <button
                  key={currency}
                  type="button"
                  onClick={() => toggleSupportedCurrency(currency as Currency)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                    config.billing.currency.supportedCurrencies.includes(currency as Currency)
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-300 text-neutral-600 hover:border-neutral-400'
                  }`}
                >
                  {currency}
                </button>
              ))}
            </div>
          </label>

          <label className="flex items-center justify-between text-sm">
            <span className="font-medium text-neutral-700">Allow manual FX rates</span>
            <Switch
              checked={config.billing.currency.allowManualFxRates}
              onCheckedChange={(checked) =>
                updateBilling('currency', {
                  ...config.billing.currency,
                  allowManualFxRates: checked
                })
              }
            />
          </label>
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || !isValid}>
          {saving ? 'Saving…' : 'Save settings'}
        </Button>
      </div>
    </div>
  );
}
