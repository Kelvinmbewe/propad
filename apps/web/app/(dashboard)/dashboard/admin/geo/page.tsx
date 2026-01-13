'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notify } from '@propad/ui';
import type { GeoSearchResult, PendingGeo } from '@propad/sdk';
import { useSdkClient } from '@/hooks/use-sdk-client';
import { ClientState } from '@/components/client-state';

const LEVEL_OPTIONS = [
  { label: 'All levels', value: '' },
  { label: 'Country', value: 'COUNTRY' },
  { label: 'Province', value: 'PROVINCE' },
  { label: 'City', value: 'CITY' },
  { label: 'Suburb', value: 'SUBURB' }
];

const STATUS_OPTIONS = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' }
];

export default function GeoAdminPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-neutral-900">Geo moderation</h1>
        <p className="text-sm text-neutral-500">
          Review pending submissions from agents and clean up duplicates before they land in the public location graph.
        </p>
      </header>
      <GeoAdminPanel />
    </div>
  );
}

function GeoAdminPanel() {
  const { sdk, status: clientStatus, message } = useSdkClient();
  const queryClient = useQueryClient();
  const [level, setLevel] = useState<string>('');
  const [status, setStatus] = useState<string>('PENDING');
  const [search, setSearch] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['geo:pending', level, status, search],
    enabled: clientStatus === 'ready',
    queryFn: () => {
      if (!sdk) {
        return [];
      }
      return sdk.geo.listPending({
        level: level || undefined,
        status: status || undefined,
        search: search.trim() || undefined
      });
    }
  });

  const selected = useMemo<PendingGeo | null>(() => {
    if (!data || data.length === 0) {
      return null;
    }
    if (selectedId) {
      return data.find((item) => item.id === selectedId) ?? data[0];
    }
    return data[0];
  }, [data, selectedId]);

  useEffect(() => {
    if (!data || data.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !data.some((item) => item.id === selectedId)) {
      setSelectedId(data[0].id);
    }
  }, [data, selectedId]);

  const duplicatesQuery = useQuery({
    queryKey: ['geo:duplicates', selected?.id, selected?.proposedName],
    enabled: clientStatus === 'ready' && Boolean(selected?.proposedName),
    queryFn: () => {
      if (!sdk) {
        return [];
      }
      return sdk.geo.search(selected?.proposedName ?? '');
    }
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => {
      if (!sdk) {
        throw new Error('Geo client not ready');
      }
      return sdk.geo.approvePending(id);
    },
    onSuccess: () => {
      notify.success('Pending geo approved');
      queryClient.invalidateQueries({ queryKey: ['geo:pending'] });
    },
    onError: () => {
      notify.error('Failed to approve pending geo');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => {
      if (!sdk) {
        throw new Error('Geo client not ready');
      }
      return sdk.geo.rejectPending(id);
    },
    onSuccess: () => {
      notify.success('Pending geo rejected');
      queryClient.invalidateQueries({ queryKey: ['geo:pending'] });
    },
    onError: () => {
      notify.error('Failed to reject pending geo');
    }
  });

  const mergeMutation = useMutation({
    mutationFn: ({ id, targetId }: { id: string; targetId: string }) =>
      sdk ? sdk.geo.mergePending(id, targetId) : Promise.reject(new Error('Geo client not ready')),
    onSuccess: () => {
      notify.success('Pending geo merged');
      queryClient.invalidateQueries({ queryKey: ['geo:pending'] });
    },
    onError: () => {
      notify.error('Failed to merge pending geo');
    }
  });

  if (clientStatus !== 'ready') {
    return <ClientState status={clientStatus} message={message} title="Geo moderation" />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <section className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">Level</span>
            <select
              value={level}
              onChange={(event) => setLevel(event.target.value)}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            >
              {LEVEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">Status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-[2] flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">Search</span>
            <input
              type="search"
              placeholder="Search proposed name"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="mt-4">
          {isLoading ? (
            <p className="text-sm text-neutral-500">Loading pending locations…</p>
          ) : isError ? (
            <p className="text-sm text-red-600">Unable to load pending geo queue.</p>
          ) : !data || data.length === 0 ? (
            <p className="text-sm text-neutral-500">No submissions match your filters.</p>
          ) : (
            <div className="overflow-hidden rounded-md border border-neutral-200">
              <table className="min-w-full divide-y divide-neutral-200 text-sm">
                <thead className="bg-neutral-50 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Level</th>
                    <th className="px-3 py-2">Submitted by</th>
                    <th className="px-3 py-2">Submitted</th>
                    <th className="px-3 py-2 text-right">Listings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {data.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={`cursor-pointer hover:bg-neutral-50 ${
                        selected?.id === item.id ? 'bg-neutral-100' : 'bg-white'
                      }`}
                    >
                      <td className="px-3 py-2 font-medium text-neutral-900">{item.proposedName}</td>
                      <td className="px-3 py-2 text-neutral-500">{item.level}</td>
                      <td className="px-3 py-2 text-neutral-500">
                        {item.proposedBy?.name ?? item.proposedBy?.email ?? 'Unknown'}
                      </td>
                      <td className="px-3 py-2 text-neutral-500">{formatRelativeTime(item.createdAt)}</td>
                      <td className="px-3 py-2 text-right text-neutral-500">{item.properties.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        {selected ? (
          <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
            <header className="space-y-1">
              <h2 className="text-lg font-semibold text-neutral-900">{selected.proposedName}</h2>
              <p className="text-sm text-neutral-500">
                {selected.level} · {selected.status}
              </p>
              <p className="text-xs text-neutral-400">
                Submitted {formatRelativeTime(selected.createdAt)} by{' '}
                {selected.proposedBy?.name ?? selected.proposedBy?.email ?? 'unknown user'}
              </p>
            </header>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={approveMutation.isPending || mergeMutation.isPending}
                onClick={() => approveMutation.mutate(selected.id)}
                className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {approveMutation.isPending ? 'Approving…' : 'Approve'}
              </button>
              <button
                type="button"
                disabled={rejectMutation.isPending || mergeMutation.isPending}
                onClick={() => rejectMutation.mutate(selected.id)}
                className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {rejectMutation.isPending ? 'Rejecting…' : 'Reject'}
              </button>
            </div>

            <div className="mt-6 space-y-2">
              <h3 className="text-sm font-semibold text-neutral-700">Fuzzy duplicates</h3>
              {duplicatesQuery.isLoading ? (
                <p className="text-xs text-neutral-500">Scanning directory…</p>
              ) : duplicatesQuery.isError ? (
                <p className="text-xs text-red-600">Unable to load potential duplicates.</p>
              ) : duplicatesQuery.data && duplicatesQuery.data.length > 0 ? (
                <ul className="space-y-2">
                  {duplicatesQuery.data.map((result) => (
                    <DuplicateRow
                      key={`${selected.id}:${result.id}`}
                      result={result}
                      disabled={mergeMutation.isPending}
                      onMerge={() => mergeMutation.mutate({ id: selected.id, targetId: result.id })}
                    />
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-neutral-500">No obvious duplicates detected.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-neutral-200 p-6 text-sm text-neutral-500">
            Select a pending location to review details and take action.
          </div>
        )}
      </section>
    </div>
  );
}

function DuplicateRow({
  result,
  onMerge,
  disabled
}: {
  result: GeoSearchResult;
  onMerge: () => void;
  disabled: boolean;
}) {
  return (
    <li className="rounded-md border border-neutral-200 p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-900">{result.name}</p>
          <p className="text-xs text-neutral-500">Existing {result.level.toLowerCase()} • {result.id}</p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onMerge}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          Merge here
        </button>
      </div>
    </li>
  );
}

function formatRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const diff = date.getTime() - Date.now();
  const minutes = Math.round(diff / (1000 * 60));
  if (Math.abs(minutes) < 60) {
    return formatter.format(Math.round(minutes), 'minute');
  }
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) {
    return formatter.format(hours, 'hour');
  }
  const days = Math.round(hours / 24);
  return formatter.format(days, 'day');
}
