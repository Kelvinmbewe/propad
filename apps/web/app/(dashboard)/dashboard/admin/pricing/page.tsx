'use client';

import { useState } from 'react';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Textarea } from '@propad/ui';
import { DollarSign, Save } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function PricingPage() {
  const sdk = useAuthenticatedSDK();
  const queryClient = useQueryClient();
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const { data: configs, isLoading } = useQuery({
    queryKey: ['admin', 'pricing'],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/pricing`, {
        headers: { Authorization: `Bearer ${sdk?.accessToken}` }
      });
      return res.json();
    }
  });

  const saveConfig = useMutation({
    mutationFn: async ({ key, value }: { key: string, value: any }) => {
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/pricing`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sdk?.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ key, value: JSON.parse(value) })
      });
    },
    onSuccess: () => {
      setEditKey(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'pricing'] });
    },
    onError: (e) => alert('Invalid JSON: ' + e)
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pricing & Rules</h1>
          <p className="text-sm text-neutral-500">Configure business logic dynamically.</p>
        </div>
      </div>

      <div className="grid gap-4">
        {isLoading ? <div>Loading...</div> : configs?.map((cfg: any) => (
          <Card key={cfg.key}>
            <CardHeader className="py-4">
              <CardTitle className="text-base font-mono flex items-center justify-between">
                {cfg.key}
                {editKey !== cfg.key && (
                  <Button variant="ghost" size="sm" onClick={() => {
                    setEditKey(cfg.key);
                    setEditValue(JSON.stringify(cfg.value, null, 2));
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
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEditKey(null)}>Cancel</Button>
                    <Button onClick={() => saveConfig.mutate({ key: cfg.key, value: editValue })}>
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
        ))}

        {configs?.length === 0 && (
          <div className="text-center p-8 text-neutral-500 border rounded-lg border-dashed">
            No configs found.
            <div className="mt-4">
              <Button onClick={() => {
                setEditKey('NEW');
                setEditValue('{}');
                // In a real app, handle creation UI better
              }}>Create Config</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
