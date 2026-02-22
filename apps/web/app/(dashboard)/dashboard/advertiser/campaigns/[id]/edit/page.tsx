'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label } from '@propad/ui';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';

export default function EditCampaignPage() {
  const params = useParams();
  const router = useRouter();
  const sdk = useAuthenticatedSDK();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [budget, setBudget] = useState('');
  const [dailyCap, setDailyCap] = useState('');
  const [endAt, setEndAt] = useState('');

  useEffect(() => {
    async function loadCampaign() {
      if (!sdk) return;
      try {
        const campaign = await sdk.ads.getCampaignById(id);
        setName(campaign.name ?? '');
        setStatus(campaign.status ?? 'DRAFT');
        setBudget(campaign.budgetCents ? (campaign.budgetCents / 100).toString() : '');
        setDailyCap(campaign.dailyCapCents ? (campaign.dailyCapCents / 100).toString() : '');
        setEndAt(campaign.endAt ? campaign.endAt.slice(0, 10) : '');
      } catch (err: any) {
        setError(err?.message || 'Failed to load campaign.');
      } finally {
        setLoading(false);
      }
    }

    loadCampaign();
  }, [sdk, id]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!sdk) return;
    setSaving(true);
    setError(null);

    try {
      const payload: any = {
        status,
        endAt: endAt ? new Date(`${endAt}T00:00:00`).toISOString() : null,
      };

      if (name.trim()) {
        payload.name = name.trim();
      }

      if (dailyCap) {
        const dailyValue = Math.round(parseFloat(dailyCap) * 100);
        if (Number.isFinite(dailyValue) && dailyValue > 0) {
          payload.dailyCapCents = dailyValue;
        }
      }

      if (status !== 'ACTIVE' && budget) {
        const budgetValue = Math.round(parseFloat(budget) * 100);
        if (Number.isFinite(budgetValue) && budgetValue > 0) {
          payload.budgetCents = budgetValue;
        }
      }

      await sdk.ads.updateCampaign(id, payload);
      router.push('/dashboard/advertiser/campaigns');
    } catch (err: any) {
      setError(err?.message || 'Failed to update campaign.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-white/70">Loading campaign...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Edit Campaign</h1>
          <p className="text-sm text-slate-600">Update budgets, caps, and campaign status.</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>Back</Button>
      </div>

      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-900">Campaign Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="editName" className="text-slate-700">Campaign name</Label>
                <Input
                  id="editName"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editStatus" className="text-slate-700">Status</Label>
                <select
                  id="editStatus"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PAUSED">Paused</option>
                  <option value="ENDED">Ended</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="editBudget" className="text-slate-700">Total budget (USD)</Label>
                <Input
                  id="editBudget"
                  type="number"
                  step="0.01"
                  min="0"
                  value={budget}
                  onChange={(event) => setBudget(event.target.value)}
                  disabled={status === 'ACTIVE'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDailyCap" className="text-slate-700">Daily cap (USD)</Label>
                <Input
                  id="editDailyCap"
                  type="number"
                  step="0.01"
                  min="0"
                  value={dailyCap}
                  onChange={(event) => setDailyCap(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editEndAt" className="text-slate-700">End date</Label>
              <Input
                id="editEndAt"
                type="date"
                value={endAt}
                onChange={(event) => setEndAt(event.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => router.push('/dashboard/advertiser/campaigns')}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
