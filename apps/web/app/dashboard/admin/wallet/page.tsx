'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notify } from '@propad/ui';
import type {
  AmlBlocklistEntry,
  KycRecord,
  PayoutAccount,
  PayoutRequest,
  WalletThreshold
} from '@propad/sdk';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';

const KYC_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED'];
const PAYOUT_STATUSES = ['REQUESTED', 'REVIEW'];
const THRESHOLD_TYPES = [
  { label: 'Min payout', value: 'MIN_PAYOUT' },
  { label: 'Max payout', value: 'MAX_PAYOUT' },
  { label: 'Review limit', value: 'REVIEW_LIMIT' }
];

export default function WalletAdminPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-neutral-900">Wallet operations</h1>
        <p className="text-sm text-neutral-500">
          Manage KYC, payout approvals, and AML guardrails to keep disbursements compliant and on schedule.
        </p>
      </header>

      <KycQueueSection />
      <PayoutApprovalsSection />
      <PayoutAccountsSection />
      <AmlBlocklistSection />
      <WalletThresholdSection />
    </div>
  );
}

function KycQueueSection() {
  const sdk = useAuthenticatedSDK();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>('PENDING');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['wallet:kyc', status],
    enabled: Boolean(sdk),
    queryFn: () => sdk!.wallets.kyc.list({ status })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: string }) =>
      sdk!.wallets.kyc.updateStatus(id, { status: nextStatus }),
    onSuccess: () => {
      notify.success('KYC status updated');
      queryClient.invalidateQueries({ queryKey: ['wallet:kyc'] });
    },
    onError: () => {
      notify.error('Unable to update KYC status');
    }
  });

  if (!sdk) {
    return <p className="text-sm text-neutral-500">Preparing wallet client…</p>;
  }

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-neutral-900">KYC queue</h2>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="ml-auto rounded-md border border-neutral-300 px-3 py-2 text-sm"
        >
          {KYC_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-4">
        {isLoading ? (
          <p className="text-sm text-neutral-500">Loading KYC records…</p>
        ) : isError ? (
          <p className="text-sm text-red-600">Unable to load KYC queue.</p>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-neutral-500">No records for this status.</p>
        ) : (
          <div className="overflow-hidden rounded-md border border-neutral-200">
            <table className="min-w-full divide-y divide-neutral-200 text-sm">
              <thead className="bg-neutral-50 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-3 py-2">Owner</th>
                  <th className="px-3 py-2">ID type</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Updated</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {data.map((record) => (
                  <KycRow
                    key={record.id}
                    record={record}
                    onUpdate={(nextStatus) => updateMutation.mutate({ id: record.id, nextStatus })}
                    disabled={updateMutation.isPending}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function KycRow({
  record,
  onUpdate,
  disabled
}: {
  record: KycRecord;
  onUpdate: (status: string) => void;
  disabled: boolean;
}) {
  return (
    <tr className="bg-white">
      <td className="px-3 py-2 font-medium text-neutral-900">
        {record.ownerType} • {record.ownerId}
      </td>
      <td className="px-3 py-2 text-neutral-500">{record.idType}</td>
      <td className="px-3 py-2 text-neutral-500">{record.status}</td>
      <td className="px-3 py-2 text-neutral-500">{formatDate(record.updatedAt)}</td>
      <td className="px-3 py-2 text-right">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onUpdate('VERIFIED')}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Approve
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onUpdate('REJECTED')}
            className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Reject
          </button>
        </div>
      </td>
    </tr>
  );
}

function PayoutApprovalsSection() {
  const sdk = useAuthenticatedSDK();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>('REQUESTED');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['wallet:payouts', status],
    enabled: Boolean(sdk),
    queryFn: () => sdk!.wallets.payoutRequests.list({ status })
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, txRef }: { id: string; txRef?: string }) =>
      sdk!.wallets.payoutRequests.approve(id, { txRef }),
    onSuccess: () => {
      notify.success('Payout approved');
      queryClient.invalidateQueries({ queryKey: ['wallet:payouts'] });
    },
    onError: () => {
      notify.error('Unable to approve payout');
    }
  });

  if (!sdk) {
    return <p className="text-sm text-neutral-500">Preparing wallet client…</p>;
  }

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-neutral-900">Payout approvals</h2>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="ml-auto rounded-md border border-neutral-300 px-3 py-2 text-sm"
        >
          {PAYOUT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-4">
        {isLoading ? (
          <p className="text-sm text-neutral-500">Loading payout requests…</p>
        ) : isError ? (
          <p className="text-sm text-red-600">Unable to load payout approvals.</p>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-neutral-500">No payout requests pending review.</p>
        ) : (
          <div className="overflow-hidden rounded-md border border-neutral-200">
            <table className="min-w-full divide-y divide-neutral-200 text-sm">
              <thead className="bg-neutral-50 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-3 py-2">Owner</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Method</th>
                  <th className="px-3 py-2">Submitted</th>
                  <th className="px-3 py-2 text-right">Approve</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {data.map((request) => (
                  <PayoutRow
                    key={request.id}
                    request={request}
                    onApprove={(txRef) => approveMutation.mutate({ id: request.id, txRef })}
                    disabled={approveMutation.isPending}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function PayoutRow({
  request,
  onApprove,
  disabled
}: {
  request: PayoutRequest;
  onApprove: (txRef?: string) => void;
  disabled: boolean;
}) {
  const amount = formatCurrency(request.wallet?.currency ?? 'USD', request.amountCents);

  return (
    <tr className="bg-white">
      <td className="px-3 py-2 font-medium text-neutral-900">
        {request.wallet?.ownerType ?? 'USER'} • {request.wallet?.ownerId ?? request.walletId}
      </td>
      <td className="px-3 py-2 text-neutral-900">{amount}</td>
      <td className="px-3 py-2 text-neutral-500">{request.method}</td>
      <td className="px-3 py-2 text-neutral-500">{formatDate(request.createdAt)}</td>
      <td className="px-3 py-2 text-right">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            const txRef = window.prompt('Transaction reference (optional)');
            onApprove(txRef ?? undefined);
          }}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          Approve
        </button>
      </td>
    </tr>
  );
}

function PayoutAccountsSection() {
  const sdk = useAuthenticatedSDK();
  const queryClient = useQueryClient();
  const [verified, setVerified] = useState<string>('false');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['wallet:payout-accounts', verified],
    enabled: Boolean(sdk),
    queryFn: () =>
      sdk!.wallets.payoutAccounts.list({ verified: verified === '' ? undefined : verified === 'true' })
  });

  const verifyMutation = useMutation({
    mutationFn: ({ id, verified }: { id: string; verified: boolean }) =>
      sdk!.wallets.payoutAccounts.verify(id, { verified }),
    onSuccess: () => {
      notify.success('Payout account updated');
      queryClient.invalidateQueries({ queryKey: ['wallet:payout-accounts'] });
    },
    onError: () => {
      notify.error('Unable to update payout account');
    }
  });

  if (!sdk) {
    return <p className="text-sm text-neutral-500">Preparing wallet client…</p>;
  }

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-neutral-900">Payout accounts</h2>
        <select
          value={verified}
          onChange={(event) => setVerified(event.target.value)}
          className="ml-auto rounded-md border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="">All</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>
      </div>
      <div className="mt-4">
        {isLoading ? (
          <p className="text-sm text-neutral-500">Loading payout accounts…</p>
        ) : isError ? (
          <p className="text-sm text-red-600">Unable to load payout accounts.</p>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-neutral-500">No payout accounts match your filters.</p>
        ) : (
          <div className="overflow-hidden rounded-md border border-neutral-200">
            <table className="min-w-full divide-y divide-neutral-200 text-sm">
              <thead className="bg-neutral-50 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-3 py-2">Owner</th>
                  <th className="px-3 py-2">Display name</th>
                  <th className="px-3 py-2">Method</th>
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {data.map((account) => (
                  <tr key={account.id} className="bg-white">
                    <td className="px-3 py-2 font-medium text-neutral-900">
                      {account.ownerType} • {account.ownerId}
                    </td>
                    <td className="px-3 py-2 text-neutral-500">{account.displayName}</td>
                    <td className="px-3 py-2 text-neutral-500">{account.type}</td>
                    <td className="px-3 py-2 text-neutral-500">{formatDate(account.createdAt)}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        disabled={verifyMutation.isPending}
                        onClick={() =>
                          verifyMutation.mutate({ id: account.id, verified: !account.verifiedAt })
                        }
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                          account.verifiedAt
                            ? 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
                            : 'bg-neutral-900 text-white hover:bg-neutral-800'
                        } disabled:cursor-not-allowed disabled:opacity-70`}
                      >
                        {account.verifiedAt ? 'Revoke' : 'Verify'}
                      </button>
                    </td>
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

function AmlBlocklistSection() {
  const sdk = useAuthenticatedSDK();
  const queryClient = useQueryClient();
  const [value, setValue] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['wallet:aml-blocklist'],
    enabled: Boolean(sdk),
    queryFn: () => sdk!.wallets.amlBlocklist.list()
  });

  const addMutation = useMutation({
    mutationFn: () => sdk!.wallets.amlBlocklist.add({ value, reason: reason || undefined }),
    onSuccess: () => {
      notify.success('Blocklist entry added');
      setValue('');
      setReason('');
      queryClient.invalidateQueries({ queryKey: ['wallet:aml-blocklist'] });
    },
    onError: () => {
      notify.error('Unable to add blocklist entry');
    }
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => sdk!.wallets.amlBlocklist.remove(id),
    onSuccess: () => {
      notify.success('Blocklist entry removed');
      queryClient.invalidateQueries({ queryKey: ['wallet:aml-blocklist'] });
    },
    onError: () => {
      notify.error('Unable to remove blocklist entry');
    }
  });

  if (!sdk) {
    return <p className="text-sm text-neutral-500">Preparing wallet client…</p>;
  }

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-neutral-900">AML blocklist</h2>
      <form
        className="mt-4 flex flex-col gap-3 md:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          if (!value.trim()) {
            notify.error('Enter a value to block');
            return;
          }
          addMutation.mutate();
        }}
      >
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Value to block (phone, account, etc.)"
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
          required
        />
        <input
          type="text"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Reason (optional)"
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={addMutation.isPending}
          className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {addMutation.isPending ? 'Adding…' : 'Add entry'}
        </button>
      </form>

      <div className="mt-4">
        {isLoading ? (
          <p className="text-sm text-neutral-500">Loading blocklist…</p>
        ) : isError ? (
          <p className="text-sm text-red-600">Unable to load AML blocklist.</p>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-neutral-500">No entries yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {data.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2"
              >
                <div>
                  <p className="font-medium text-neutral-900">{entry.value}</p>
                  <p className="text-xs text-neutral-500">{entry.reason ?? 'No reason provided'}</p>
                </div>
                <button
                  type="button"
                  disabled={removeMutation.isPending}
                  onClick={() => removeMutation.mutate(entry.id)}
                  className="rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function WalletThresholdSection() {
  const sdk = useAuthenticatedSDK();
  const queryClient = useQueryClient();
  const [type, setType] = useState<string>('MIN_PAYOUT');
  const [currency, setCurrency] = useState<string>('USD');
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState<string>('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['wallet:thresholds'],
    enabled: Boolean(sdk),
    queryFn: () => sdk!.wallets.thresholds.list()
  });

  const upsertMutation = useMutation({
    mutationFn: () =>
      sdk!.wallets.thresholds.upsert({ type, currency, amountCents: amount, note: note || undefined }),
    onSuccess: () => {
      notify.success('Threshold saved');
      setAmount(0);
      setNote('');
      queryClient.invalidateQueries({ queryKey: ['wallet:thresholds'] });
    },
    onError: () => {
      notify.error('Unable to save threshold');
    }
  });

  if (!sdk) {
    return <p className="text-sm text-neutral-500">Preparing wallet client…</p>;
  }

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-neutral-900">Thresholds</h2>

      <form
        className="mt-4 grid gap-3 md:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!amount || amount <= 0) {
            notify.error('Enter a positive amount in cents');
            return;
          }
          upsertMutation.mutate();
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Type</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2"
          >
            {THRESHOLD_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Currency</span>
          <input
            type="text"
            value={currency}
            onChange={(event) => setCurrency(event.target.value.toUpperCase())}
            className="rounded-md border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Amount (cents)</span>
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(event) => setAmount(Number(event.target.value))}
            className="rounded-md border border-neutral-300 px-3 py-2"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Note</span>
          <input
            type="text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2"
            placeholder="Optional context"
          />
        </label>
        <div className="md:col-span-4">
          <button
            type="submit"
            disabled={upsertMutation.isPending}
            className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {upsertMutation.isPending ? 'Saving…' : 'Save threshold'}
          </button>
        </div>
      </form>

      <div className="mt-4">
        {isLoading ? (
          <p className="text-sm text-neutral-500">Loading thresholds…</p>
        ) : isError ? (
          <p className="text-sm text-red-600">Unable to load thresholds.</p>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-neutral-500">No custom thresholds configured.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {data.map((threshold) => (
              <li
                key={`${threshold.type}-${threshold.currency}-${threshold.id ?? 'env'}`}
                className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2"
              >
                <div>
                  <p className="font-medium text-neutral-900">
                    {threshold.type} • {threshold.currency}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {threshold.source === 'env' ? 'From environment' : 'Custom override'} ·{' '}
                    {threshold.note ?? 'No notes'}
                  </p>
                </div>
                <span className="text-neutral-900">{formatCurrency(threshold.currency, threshold.amountCents)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function formatCurrency(currency: string, cents: number) {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).format(cents / 100);
  } catch (error) {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

function formatDate(value: string | null) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    return value;
  }
}
