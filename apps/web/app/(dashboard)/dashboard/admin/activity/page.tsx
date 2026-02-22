'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, Input } from '@propad/ui';
import { format } from 'date-fns';
import { useSdkClient } from '@/hooks/use-sdk-client';
import { ClientState } from '@/components/client-state';

export default function AdminActivityPage() {
  const { sdk, status, message } = useSdkClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-audit-logs'],
    enabled: status === 'ready',
    queryFn: async () => {
      if (!sdk) return [];
      return sdk.admin.auditLogs.list();
    },
  });

  const [actorFilter, setActorFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [targetFilter, setTargetFilter] = useState('');

  const filteredLogs = useMemo(() => {
    const actorTerm = actorFilter.trim().toLowerCase();
    const actionTerm = actionFilter.trim().toLowerCase();
    const targetTerm = targetFilter.trim().toLowerCase();

    return (data ?? []).filter((entry: any) => {
      const actorValue = [entry.actor?.name, entry.actor?.email, entry.actorId]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const actionValue = (entry.action || '').toLowerCase();
      const targetValue = `${entry.targetType || ''} ${entry.targetId || ''}`.toLowerCase();

      if (actorTerm && !actorValue.includes(actorTerm)) return false;
      if (actionTerm && !actionValue.includes(actionTerm)) return false;
      if (targetTerm && !targetValue.includes(targetTerm)) return false;
      return true;
    });
  }, [data, actorFilter, actionFilter, targetFilter]);

  if (status !== 'ready') {
    return <ClientState status={status} message={message} title="Activity logs" />;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-neutral-900">Activity Logs</h1>
        <p className="text-sm text-neutral-600">
          Track admin actions across users, companies, and compliance workflows.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Admin Actions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid gap-3 border-b border-neutral-200 px-6 py-4 md:grid-cols-3">
            <Input
              placeholder="Filter by actor"
              value={actorFilter}
              onChange={(event) => setActorFilter(event.target.value)}
            />
            <Input
              placeholder="Filter by action"
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
            />
            <Input
              placeholder="Filter by target"
              value={targetFilter}
              onChange={(event) => setTargetFilter(event.target.value)}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-medium">
                <tr>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Actor</th>
                  <th className="px-6 py-3">Target</th>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                      Loading activity…
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-red-600">
                      Unable to load audit logs right now.
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                      No matching audit entries.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((entry: any) => (
                    <tr key={entry.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="px-6 py-3 font-medium text-neutral-900">
                        {entry.action}
                      </td>
                      <td className="px-6 py-3 text-neutral-600">
                        {entry.actor?.name || entry.actor?.email || entry.actorId || 'System'}
                      </td>
                      <td className="px-6 py-3 text-neutral-500">
                        {entry.targetType}
                        {entry.targetId ? ` • ${entry.targetId}` : ''}
                      </td>
                      <td className="px-6 py-3 text-neutral-500">
                        {entry.createdAt ? format(new Date(entry.createdAt), 'MMM d, yyyy HH:mm') : '—'}
                      </td>
                      <td className="px-6 py-3 text-xs text-neutral-500">
                        {entry.metadata ? JSON.stringify(entry.metadata).slice(0, 120) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
