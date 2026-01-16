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
      <div className="flex flex-col gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pricing & Rules</h1>
          <p className="text-sm text-neutral-500">Configure business logic dynamically.</p>
        </div>
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-700">
          Manage listing pricing inputs like agent fee tiers and featured listing plans here.
          Keys in use: <span className="font-semibold">pricing.agentFees</span> and{' '}
          <span className="font-semibold">pricing.featuredPlans</span>.
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
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button
                onClick={() => {
                  setEditKey('pricing.agentFees');
                  setEditValue(
                    JSON.stringify(
                      [
                        { min: 0, max: 49, feeUsd: 25, label: 'Starter' },
                        { min: 50, max: 79, feeUsd: 35, label: 'Trusted' },
                        { min: 80, max: 100, feeUsd: 50, label: 'Elite' }
                      ],
                      null,
                      2
                    )
                  );
                  setJsonError(null);
                }}
              >
                Add agent fee tiers
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditKey('pricing.featuredPlans');
                  setEditValue(
                    JSON.stringify(
                      [
                        {
                          id: 'starter',
                          label: 'Starter Boost',
                          durationDays: 7,
                          discountPercent: 0,
                          description: '7 days featured placement'
                        },
                        {
                          id: 'growth',
                          label: 'Growth Boost',
                          durationDays: 14,
                          discountPercent: 10,
                          description: '2 weeks featured placement'
                        },
                        {
                          id: 'pro',
                          label: 'Pro Boost',
                          durationDays: 30,
                          discountPercent: 20,
                          description: 'Full month featured placement'
                        }
                      ],
                      null,
                      2
                    )
                  );
                  setJsonError(null);
                }}
              >
                Add featured plans
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setEditKey('NEW');
                  setEditValue('{}');
                  setJsonError(null);
                }}
              >
                Create custom config
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
