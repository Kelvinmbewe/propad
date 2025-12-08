'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { notify } from '@propad/ui';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';

export default function RateAdminPage() {
  const sdk = useAuthenticatedSDK();
  const [base, setBase] = useState<string>('USD');
  const [quote, setQuote] = useState<string>('ZWG');
  const [rate, setRate] = useState<number>(1);
  const [effectiveDate, setEffectiveDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const mutation = useMutation({
    mutationFn: () =>
      sdk!.admin.fxRates.create({
        base,
        quote,
        rate,
        effectiveDate
      }),
    onSuccess: () => {
      notify.success('FX rate saved');
    },
    onError: () => {
      notify.error('Unable to save FX rate');
    }
  });

  if (!sdk) {
    return <p className="text-sm text-neutral-500">Preparing rate admin tools…</p>;
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-neutral-900">Manual FX rate</h1>
        <p className="text-sm text-neutral-500">
          Override daily FX rates when billing requires a manual adjustment. Rates apply to invoice issuance on the effective date.
        </p>
      </header>

      <form
        className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          if (base === quote) {
            notify.error('Base and quote currencies must differ');
            return;
          }
          if (rate <= 0) {
            notify.error('Enter a positive rate');
            return;
          }
          mutation.mutate();
        }}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">Base currency</span>
            <input
              type="text"
              value={base}
              onChange={(event) => setBase(event.target.value.toUpperCase())}
              className="rounded-md border border-neutral-300 px-3 py-2"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">Quote currency</span>
            <input
              type="text"
              value={quote}
              onChange={(event) => setQuote(event.target.value.toUpperCase())}
              className="rounded-md border border-neutral-300 px-3 py-2"
              required
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Rate</span>
          <input
            type="number"
            step="0.0001"
            min={0}
            value={rate}
            onChange={(event) => setRate(Number(event.target.value))}
            className="rounded-md border border-neutral-300 px-3 py-2"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Effective date</span>
          <input
            type="date"
            value={effectiveDate}
            onChange={(event) => setEffectiveDate(event.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2"
            required
          />
        </label>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {mutation.isPending ? 'Saving…' : 'Save FX rate'}
        </button>
      </form>
    </div>
  );
}
