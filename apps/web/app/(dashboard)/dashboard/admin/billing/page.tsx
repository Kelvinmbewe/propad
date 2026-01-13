'use client';
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notify } from '@propad/ui';
import type { Invoice, PaymentIntent, Transaction } from '@propad/sdk';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';

const INVOICE_STATUSES = ['DRAFT', 'OPEN', 'PAID', 'VOID'];
const INTENT_STATUSES = ['REQUIRES_ACTION', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED'];
const TRANSACTION_RESULTS = ['SUCCESS', 'FAILED'];
const PAYMENT_GATEWAYS = ['PAYNOW', 'STRIPE', 'PAYPAL', 'OFFLINE'];

type BillingTab = 'invoices' | 'intents' | 'transactions';

export default function BillingAdminPage() {
  const [tab, setTab] = useState<BillingTab>('invoices');

  return (
    <div className="flex flex-col gap-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-neutral-900">Billing operations</h1>
        <p className="text-sm text-neutral-500">
          Track invoice lifecycles, review payment intents, and audit settlement transactions. CSV exports make it easy to share snapshots with finance.
        </p>
      </header>

      <nav className="flex gap-2">
        <TabButton label="Invoices" active={tab === 'invoices'} onClick={() => setTab('invoices')} />
        <TabButton label="Payment intents" active={tab === 'intents'} onClick={() => setTab('intents')} />
        <TabButton label="Transactions" active={tab === 'transactions'} onClick={() => setTab('transactions')} />
      </nav>

      {tab === 'invoices' && <InvoicePanel />}
      {tab === 'intents' && <PaymentIntentsPanel />}
      {tab === 'transactions' && <TransactionsPanel />}
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-2 text-sm font-medium transition ${
        active ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
      }`}
    >
      {label}
    </button>
  );
}

function InvoicePanel() {
  const sdk = useAuthenticatedSDK();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>('OPEN');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin:invoices', status],
    enabled: Boolean(sdk),
    queryFn: () => sdk!.admin.invoices.list({ status })
  });

  const selected = useMemo<Invoice | null>(() => {
    if (!data || data.length === 0) {
      return null;
    }
    if (selectedId) {
      return data.find((invoice) => invoice.id === selectedId) ?? data[0];
    }
    return data[0];
  }, [data, selectedId]);

  const markPaidMutation = useMutation({
    mutationFn: (payload: { id: string; amountCents: number; notes?: string; paidAt: string | Date }) =>
      sdk!.admin.invoices.markPaid(payload.id, {
        amountCents: payload.amountCents,
        notes: payload.notes,
        paidAt: payload.paidAt
      }),
    onSuccess: () => {
      notify.success('Invoice marked as paid');
      queryClient.invalidateQueries({ queryKey: ['admin:invoices'] });
    },
    onError: () => {
      notify.error('Unable to mark invoice as paid');
    }
  });

  const handleExport = async () => {
    if (!sdk) return;
    const csv = await sdk.admin.invoices.export({ status });
    triggerDownload(`invoices-${status.toLowerCase()}.csv`, csv);
    notify.success('Invoice export ready');
  };

  if (!sdk) {
    return <p className="text-sm text-neutral-500">Preparing billing client…</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <section className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-neutral-700">
            <span className="mr-2 font-medium">Status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            >
              {INVOICE_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={handleExport}
            className="ml-auto rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
          >
            Export CSV
          </button>
        </div>

        <div className="mt-4">
          {isLoading ? (
            <p className="text-sm text-neutral-500">Loading invoices…</p>
          ) : isError ? (
            <p className="text-sm text-red-600">Unable to load invoices.</p>
          ) : !data || data.length === 0 ? (
            <p className="text-sm text-neutral-500">No invoices found for the selected status.</p>
          ) : (
            <div className="overflow-hidden rounded-md border border-neutral-200">
              <table className="min-w-full divide-y divide-neutral-200 text-sm">
                <thead className="bg-neutral-50 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-3 py-2">Invoice</th>
                    <th className="px-3 py-2">Issued</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {data.map((invoice) => (
                    <tr
                      key={invoice.id}
                      onClick={() => setSelectedId(invoice.id)}
                      className={`cursor-pointer hover:bg-neutral-50 ${
                        selected?.id === invoice.id ? 'bg-neutral-100' : 'bg-white'
                      }`}
                    >
                      <td className="px-3 py-2 font-medium text-neutral-900">{invoice.invoiceNo ?? invoice.id}</td>
                      <td className="px-3 py-2 text-neutral-500">
                        {invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-3 py-2 text-neutral-500">{invoice.status}</td>
                      <td className="px-3 py-2 text-right text-neutral-900">
                        {formatCurrency(invoice.currency, invoice.amountCents + invoice.taxCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section>
        {selected ? (
          <InvoiceDetail
            invoice={selected}
            isMarkingPaid={markPaidMutation.isPending}
            onMarkPaid={(payload) =>
              markPaidMutation.mutate({
                id: selected.id,
                amountCents: payload.amountCents,
                notes: payload.notes,
                paidAt: payload.paidAt
              })
            }
          />
        ) : (
          <div className="rounded-lg border border-dashed border-neutral-200 p-6 text-sm text-neutral-500">
            Select an invoice to review line items and settlement history.
          </div>
        )}
      </section>
    </div>
  );
}

function InvoiceDetail({
  invoice,
  isMarkingPaid,
  onMarkPaid
}: {
  invoice: Invoice;
  isMarkingPaid: boolean;
  onMarkPaid: (payload: { amountCents: number; notes?: string; paidAt: string | Date }) => void;
}) {
  const [amount, setAmount] = useState<number>(invoice.amountCents + invoice.taxCents);
  const [notes, setNotes] = useState<string>('');
  const [paidAt, setPaidAt] = useState<string>(() => new Date().toISOString().slice(0, 16));

  useEffect(() => {
    setAmount(invoice.amountCents + invoice.taxCents);
    setNotes('');
    setPaidAt(new Date().toISOString().slice(0, 16));
  }, [invoice.id, invoice.amountCents, invoice.taxCents]);

  return (
    <div className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-neutral-900">Invoice {invoice.invoiceNo ?? invoice.id}</h2>
        <p className="text-sm text-neutral-500">{invoice.status}</p>
        <p className="text-xs text-neutral-400">Created {new Date(invoice.createdAt).toLocaleString()}</p>
      </header>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="font-medium text-neutral-600">Subtotal</dt>
          <dd className="text-neutral-900">{formatCurrency(invoice.currency, invoice.amountCents)}</dd>
        </div>
        <div>
          <dt className="font-medium text-neutral-600">Tax</dt>
          <dd className="text-neutral-900">{formatCurrency(invoice.currency, invoice.taxCents)}</dd>
        </div>
        <div>
          <dt className="font-medium text-neutral-600">Total due</dt>
          <dd className="text-neutral-900">
            {formatCurrency(invoice.currency, invoice.amountCents + invoice.taxCents)}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-neutral-600">Due date</dt>
          <dd className="text-neutral-900">{invoice.dueAt ? new Date(invoice.dueAt).toLocaleDateString() : '—'}</dd>
        </div>
      </dl>

      <div>
        <h3 className="text-sm font-semibold text-neutral-700">Line items</h3>
        <ul className="mt-2 space-y-2 text-sm text-neutral-600">
          {invoice.lines.map((line) => (
            <li key={line.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-neutral-800">{line.description}</p>
                <p className="text-xs text-neutral-500">
                  {line.qty} × {formatCurrency(invoice.currency, line.unitPriceCents)}
                </p>
              </div>
              <span className="text-neutral-900">{formatCurrency(invoice.currency, line.totalCents)}</span>
            </li>
          ))}
        </ul>
      </div>

      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!amount || amount <= 0) {
            notify.error('Enter a valid amount');
            return;
          }
          const iso = paidAt ? new Date(paidAt).toISOString() : new Date().toISOString();
          onMarkPaid({ amountCents: amount, notes, paidAt: iso });
        }}
      >
        <h3 className="text-sm font-semibold text-neutral-700">Mark offline payment</h3>
        <div className="grid gap-3 text-sm md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="font-medium text-neutral-700">Amount (cents)</span>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(event) => setAmount(Number(event.target.value))}
              className="rounded-md border border-neutral-300 px-3 py-2"
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-medium text-neutral-700">Paid at</span>
            <input
              type="datetime-local"
              value={paidAt}
              onChange={(event) => setPaidAt(event.target.value)}
              className="rounded-md border border-neutral-300 px-3 py-2"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Notes</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            className="rounded-md border border-neutral-300 px-3 py-2"
            placeholder="Optional context for audit trail"
          />
        </label>
        <button
          type="submit"
          disabled={isMarkingPaid}
          className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isMarkingPaid ? 'Recording payment…' : 'Mark as paid'}
        </button>
      </form>
    </div>
  );
}

function PaymentIntentsPanel() {
  const sdk = useAuthenticatedSDK();
  const [status, setStatus] = useState<string>('REQUIRES_ACTION');
  const [gateway, setGateway] = useState<string>('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin:intents', status, gateway],
    enabled: Boolean(sdk),
    queryFn: () =>
      sdk!.admin.paymentIntents.list({
        status: status || undefined,
        gateway: gateway || undefined
      })
  });

  const handleExport = async () => {
    if (!sdk) return;
    const csv = await sdk.admin.paymentIntents.export({
      status: status || undefined,
      gateway: gateway || undefined
    });
    triggerDownload('payment-intents.csv', csv);
    notify.success('Payment intent export ready');
  };

  if (!sdk) {
    return <p className="text-sm text-neutral-500">Preparing billing client…</p>;
  }

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-neutral-700">
          <span className="mr-2 font-medium">Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {INTENT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-neutral-700">
          <span className="mr-2 font-medium">Gateway</span>
          <select
            value={gateway}
            onChange={(event) => setGateway(event.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {PAYMENT_GATEWAYS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={handleExport}
          className="ml-auto rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
        >
          Export CSV
        </button>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <p className="text-sm text-neutral-500">Loading payment intents…</p>
        ) : isError ? (
          <p className="text-sm text-red-600">Unable to load payment intents.</p>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-neutral-500">No intents found.</p>
        ) : (
          <div className="overflow-hidden rounded-md border border-neutral-200">
            <table className="min-w-full divide-y divide-neutral-200 text-sm">
              <thead className="bg-neutral-50 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-3 py-2">Reference</th>
                  <th className="px-3 py-2">Invoice</th>
                  <th className="px-3 py-2">Gateway</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {data.map((intent) => (
                  <IntentRow key={intent.id} intent={intent} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function IntentRow({ intent }: { intent: PaymentIntent }) {
  return (
    <tr className="bg-white">
      <td className="px-3 py-2 font-medium text-neutral-900">{intent.reference}</td>
      <td className="px-3 py-2 text-neutral-500">{intent.invoice?.invoiceNo ?? intent.invoiceId}</td>
      <td className="px-3 py-2 text-neutral-500">{intent.gateway}</td>
      <td className="px-3 py-2 text-neutral-500">{intent.status}</td>
      <td className="px-3 py-2 text-right text-neutral-900">
        {formatCurrency(intent.currency, intent.amountCents)}
      </td>
      <td className="px-3 py-2 text-neutral-500">{new Date(intent.createdAt).toLocaleString()}</td>
    </tr>
  );
}

function TransactionsPanel() {
  const sdk = useAuthenticatedSDK();
  const [result, setResult] = useState<string>('');
  const [gateway, setGateway] = useState<string>('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin:transactions', result, gateway],
    enabled: Boolean(sdk),
    queryFn: () =>
      sdk!.admin.transactions.list({
        result: result || undefined,
        gateway: gateway || undefined
      })
  });

  const handleExport = async () => {
    if (!sdk) return;
    const csv = await sdk.admin.transactions.export({
      result: result || undefined,
      gateway: gateway || undefined
    });
    triggerDownload('transactions.csv', csv);
    notify.success('Transaction export ready');
  };

  if (!sdk) {
    return <p className="text-sm text-neutral-500">Preparing billing client…</p>;
  }

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-neutral-700">
          <span className="mr-2 font-medium">Result</span>
          <select
            value={result}
            onChange={(event) => setResult(event.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {TRANSACTION_RESULTS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-neutral-700">
          <span className="mr-2 font-medium">Gateway</span>
          <select
            value={gateway}
            onChange={(event) => setGateway(event.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {PAYMENT_GATEWAYS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={handleExport}
          className="ml-auto rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
        >
          Export CSV
        </button>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <p className="text-sm text-neutral-500">Loading transactions…</p>
        ) : isError ? (
          <p className="text-sm text-red-600">Unable to load transactions.</p>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-neutral-500">No transactions found.</p>
        ) : (
          <div className="overflow-hidden rounded-md border border-neutral-200">
            <table className="min-w-full divide-y divide-neutral-200 text-sm">
              <thead className="bg-neutral-50 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-3 py-2">External ref</th>
                  <th className="px-3 py-2">Invoice</th>
                  <th className="px-3 py-2">Gateway</th>
                  <th className="px-3 py-2">Result</th>
                  <th className="px-3 py-2 text-right">Net</th>
                  <th className="px-3 py-2">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {data.map((transaction) => (
                  <tr key={transaction.id} className="bg-white">
                    <td className="px-3 py-2 font-medium text-neutral-900">{transaction.externalRef}</td>
                    <td className="px-3 py-2 text-neutral-500">{transaction.invoice?.invoiceNo ?? transaction.invoiceId}</td>
                    <td className="px-3 py-2 text-neutral-500">{transaction.gateway}</td>
                    <td className="px-3 py-2 text-neutral-500">{transaction.result}</td>
                    <td className="px-3 py-2 text-right text-neutral-900">
                      {formatCurrency(transaction.currency, transaction.netCents)}
                    </td>
                    <td className="px-3 py-2 text-neutral-500">{new Date(transaction.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function formatCurrency(currency: string, cents: number) {
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2
    }).format(cents / 100);
  } catch (error) {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

function triggerDownload(filename: string, contents: string) {
  const blob = new Blob([contents], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
