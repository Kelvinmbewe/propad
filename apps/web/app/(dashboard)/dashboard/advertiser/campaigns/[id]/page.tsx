'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@propad/ui';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';

export default function CampaignDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const sdk = useAuthenticatedSDK();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<any | null>(null);

  useEffect(() => {
    async function loadCampaign() {
      if (!sdk) return;
      try {
        const data = await sdk.ads.getCampaignById(id);
        setCampaign(data);
      } catch (error) {
        console.error('Failed to load campaign:', error);
      } finally {
        setLoading(false);
      }
    }

    loadCampaign();
  }, [sdk, id]);

  if (loading) {
    return <div className="p-6 text-sm text-slate-600">Loading campaign...</div>;
  }

  if (!campaign) {
    return (
      <div className="p-6 text-center text-slate-600 space-y-4">
        <p className="text-lg font-semibold">Campaign not found</p>
        <Button onClick={() => router.push('/dashboard/advertiser/campaigns')}>Back to Campaigns</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{campaign.name}</h1>
          <p className="text-sm text-slate-500">Campaign details</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/dashboard/advertiser/campaigns')}>Back</Button>
          <Button onClick={() => router.push(`/dashboard/advertiser/campaigns/${id}/edit`)}>Edit</Button>
          <Button variant="secondary" onClick={() => router.push(`/dashboard/advertiser/campaigns/${id}/analytics`)}>Analytics</Button>
        </div>
      </div>

      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-900">Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 text-slate-700">
          <div className="space-y-2">
            <div className="text-xs uppercase text-slate-400">Type</div>
            <div className="font-semibold">
              {campaign.type}
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase text-slate-400">Status</div>
            <Badge variant="outline" className="border-slate-300 text-slate-700">
              {campaign.status}
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase text-slate-400">Start</div>
            <div className="font-semibold">
              {new Date(campaign.startAt).toLocaleDateString()}
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase text-slate-400">End</div>
            <div className="font-semibold">
              {campaign.endAt ? new Date(campaign.endAt).toLocaleDateString() : '—'}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
