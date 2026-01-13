'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, Button, Textarea } from '@propad/ui';
import { Save } from 'lucide-react';
import { useSdkClient } from '@/hooks/use-sdk-client';
import { ClientState } from '@/components/client-state';

interface PricingConfig {
  key: string;
  value: unknown;
  updatedAt: string;
}

export default function PricingPage() {
  const queryClient = useQueryClient();
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const { status, message, apiBaseUrl, accessToken } = useSdkClient();

  const { data: configs, isLoading, isError } = useQuery<PricingConfig[]>({
    queryKey: ['admin', 'pricing'],
    enabled: status === 'ready',
    queryFn: async () => {
      if (!apiBaseUrl || !accessToken) {
        return [];
      }
      const response = await fetch(`${apiBaseUrl}/admin/pricing`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to load pricing configurations');
      }
      return response.json();
    }
  });

  const saveConfig = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      if (!apiBaseUrl || !accessToken) {
        throw new Error('Pricing client not ready');
      }

      setJsonError(null);
      let parsedValue: unknown;
      try {
        parsedValue = JSON.parse(value);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid JSON payload';
        setJsonError(message);
        throw error;
      }

      const response = await fetch(`${apiBaseUrl}/admin/pricing`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ key, value: parsedValue })
      });

      if (!response.ok) {
        throw new Error('Failed to update pricing configuration');
      }
      return response.json();
    },
    onSuccess: () => {
      setEditKey(null);
      setEditValue('');
      setJsonError(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'pricing'] });
    },
    onError: (error) => {
      if (error instanceof Error && !jsonError) {
        setJsonError(error.message);
      }
    }
  });

  if (status !== 'ready') {
    return <ClientState status={status} message={message} title="Pricing admin" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pricing & Rules</h1>
          <p className="text-sm text-neutral-500">Configure business logic dynamically.</p>
        </div>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="rounded-lg border border-neutral-200 bg-white p-6 text-sm text-neutral-500">
            Loading pricing configurations…
          </div>
        ) : isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-600">
            Unable to load pricing configurations. Please try again.
          </div>
        ) : (
          configs?.map((cfg) => (
            <Card key={cfg.key}>
            <CardHeader className="py-4">
              <CardTitle className="text-base font-mono flex items-center justify-between">
                {cfg.key}
                {editKey !== cfg.key && (
                  <Button variant="ghost" size="sm" onClick={() => {
                    setEditKey(cfg.key);
                    setEditValue(JSON.stringify(cfg.value, null, 2));
                    setJsonError(null);
                  }}>Edit</Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editKey === cfg.key ? (
                <div className="space-y-4">
                  <Textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="font-mono text-xs"
                    rows={5}
                  />
                  {jsonError && (
                    <p className="text-xs text-red-600">{jsonError}</p>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => {
                      setEditKey(null);
                      setJsonError(null);
                    }}>Cancel</Button>
                    <Button
                      onClick={() => saveConfig.mutate({ key: cfg.key, value: editValue })}
                      disabled={saveConfig.isPending}
                    >
                      <Save className="mr-2 h-4 w-4" /> Save
                    </Button>
                  </div>
                </div>
              ) : (
                <pre className="text-xs bg-neutral-50 p-3 rounded overflow-auto">
                  {JSON.stringify(cfg.value, null, 2)}
                </pre>
              )}
              <div className="mt-2 text-xs text-neutral-400">
                Updated: {new Date(cfg.updatedAt).toLocaleString()}
              </div>
            </CardContent>
            </Card>
          ))
        )}

        {configs?.length === 0 && !isLoading && !isError && (
          <div className="text-center p-8 text-neutral-500 border rounded-lg border-dashed">
            No configs found.
            <div className="mt-4">
              <Button onClick={() => {
                setEditKey('NEW');
                setEditValue('{}');
                setJsonError(null);
              }}>Create Config</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
