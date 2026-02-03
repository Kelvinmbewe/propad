'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@propad/ui';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';

const CAMPAIGN_TYPES = [
  { value: 'PROPERTY_BOOST', label: 'Property Boost' },
  { value: 'BANNER', label: 'Banner' },
  { value: 'SEARCH_SPONSOR', label: 'Search Sponsor' },
] as const;

export default function CreateCampaignPage() {
  const router = useRouter();
  const sdk = useAuthenticatedSDK();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState<(typeof CAMPAIGN_TYPES)[number]['value']>(
    'PROPERTY_BOOST',
  );
  const [targetPropertyId, setTargetPropertyId] = useState('');
  const [placementId, setPlacementId] = useState('');
  const [creativeMode, setCreativeMode] = useState<'new' | 'existing'>('new');
  const [creativeId, setCreativeId] = useState('');
  const [creativeKind, setCreativeKind] = useState<'IMAGE' | 'HTML'>('IMAGE');
  const [creativeFile, setCreativeFile] = useState<File | null>(null);
  const [creativeClickUrl, setCreativeClickUrl] = useState('');
  const [creativeWidth, setCreativeWidth] = useState('1200');
  const [creativeHeight, setCreativeHeight] = useState('628');
  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const [ctaLabel, setCtaLabel] = useState('Learn more');
  const [budget, setBudget] = useState('');
  const [dailyCap, setDailyCap] = useState('');
  const [dailyImpressions, setDailyImpressions] = useState('');
  const [cpm, setCpm] = useState('');
  const [cpc, setCpc] = useState('');
  const [startAt, setStartAt] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [endAt, setEndAt] = useState('');

  const placementsQuery = useQuery({
    queryKey: ['ads-placements'],
    enabled: !!sdk,
    queryFn: async () => sdk!.ads.getPlacements(),
  });

  const propertiesQuery = useQuery({
    queryKey: ['ads-owned-properties'],
    enabled: !!sdk && type === 'PROPERTY_BOOST',
    queryFn: async () => sdk!.properties.listOwned(),
  });

  const placements = placementsQuery.data ?? [];
  const creativesQuery = useQuery({
    queryKey: ['ads-creatives'],
    enabled: !!sdk,
    queryFn: async () => sdk!.ads.getCreatives(),
  });
  const creatives = creativesQuery.data ?? [];
  const propertyOptions = useMemo(() => {
    const items = propertiesQuery.data ?? [];
    return items
      .map((item: any) => {
        const id = item.id ?? item.property?.id;
        if (!id) return null;
        return {
          id,
          title: item.title ?? item.property?.title ?? 'Untitled property',
        };
      })
      .filter(Boolean) as Array<{ id: string; title: string }>;
  }, [propertiesQuery.data]);

  const availablePlacements = useMemo(() => {
    return placements.filter((placement: any) => {
      const allowed = Array.isArray(placement.allowedTypes)
        ? placement.allowedTypes
        : [];
      if (allowed.length === 0) return true;
      const creativeType = creativeKind === 'IMAGE' ? 'IMAGE' : 'HTML';
      return allowed.includes(creativeType);
    });
  }, [placements, creativeKind]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!sdk) {
      setError('Your session is not ready. Please refresh and try again.');
      return;
    }

    if (!name.trim()) {
      setError('Campaign name is required.');
      return;
    }

    if (type === 'PROPERTY_BOOST' && !targetPropertyId) {
      setError('Select a property to boost.');
      return;
    }

    if (type !== 'PROPERTY_BOOST' && !placementId) {
      setError('Select a placement for this campaign type.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: any = {
        name: name.trim(),
        type,
        startAt: new Date(`${startAt}T00:00:00`).toISOString(),
      };

      if (endAt) {
        payload.endAt = new Date(`${endAt}T00:00:00`).toISOString();
      }

      if (targetPropertyId) {
        payload.targetPropertyId = targetPropertyId;
      }

      if (budget) {
        payload.budgetCents = Math.round(parseFloat(budget) * 100);
      }

      if (dailyCap) {
        payload.dailyCapCents = Math.round(parseFloat(dailyCap) * 100);
      }

      if (dailyImpressions) {
        payload.dailyCapImpressions = parseInt(dailyImpressions, 10);
      }

      if (cpm) {
        payload.cpmUsdCents = Math.round(parseFloat(cpm) * 100);
      }

      if (cpc) {
        payload.cpcUsdCents = Math.round(parseFloat(cpc) * 100);
      }

      if (type !== 'PROPERTY_BOOST') {
        let resolvedCreativeId = creativeId;

        if (creativeMode === 'new') {
          if (!creativeClickUrl.trim()) {
            setError('Provide a click URL for this creative.');
            setIsSubmitting(false);
            return;
          }

          const width = Number(creativeWidth);
          const height = Number(creativeHeight);
          if (!Number.isFinite(width) || !Number.isFinite(height)) {
            setError('Creative width and height are required.');
            setIsSubmitting(false);
            return;
          }

          if (creativeKind === 'IMAGE') {
            if (!creativeFile) {
              setError('Upload a banner image.');
              setIsSubmitting(false);
              return;
            }

            const created = await sdk.ads.uploadCreative({
              file: creativeFile,
              clickUrl: creativeClickUrl.trim(),
              width,
              height,
            });
            resolvedCreativeId = created.id;
          } else {
            if (!headline.trim()) {
              setError('Provide a headline for the text ad.');
              setIsSubmitting(false);
              return;
            }

            const htmlSnippet = `
              <div style="font-family: 'Inter', Arial, sans-serif; border-radius: 16px; border: 1px solid #e2e8f0; padding: 20px; background: #ffffff; color: #0f172a;">
                <div style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8;">Sponsored</div>
                <div style="font-size: 20px; font-weight: 700; margin-top: 10px;">${headline.trim()}</div>
                <div style="margin-top: 8px; color: #475569; font-size: 14px; line-height: 1.5;">${body.trim()}</div>
                <div style="margin-top: 14px; display: inline-block; background: #2563eb; color: #fff; padding: 8px 14px; border-radius: 999px; font-size: 12px; font-weight: 600;">${ctaLabel.trim() || 'Learn more'}</div>
              </div>
            `;

            const created = await sdk.ads.createCreative({
              type: 'HTML',
              htmlSnippet,
              clickUrl: creativeClickUrl.trim(),
              width,
              height,
            });
            resolvedCreativeId = created.id;
          }
        }

        if (!resolvedCreativeId) {
          setError('Select or create a creative before launching.');
          setIsSubmitting(false);
          return;
        }

        payload.targetingJson = {
          placementId,
          creativeId: resolvedCreativeId,
        };
      }

      await sdk.ads.createCampaign(payload);
      router.push('/dashboard/advertiser/campaigns');
    } catch (err: any) {
      setError(err?.message || 'Failed to create campaign.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Create Campaign</h1>
          <p className="text-sm text-slate-600">
            Launch a new ad campaign with real placement inventory.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>

      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-900">Campaign Details</CardTitle>
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
                <Label htmlFor="campaignName" className="text-slate-700">Campaign name</Label>
                <Input
                  id="campaignName"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Harare Summer Boost"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaignType" className="text-slate-700">Campaign type</Label>
                <select
                  id="campaignType"
                  value={type}
                  onChange={(event) => setType(event.target.value as any)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  {CAMPAIGN_TYPES.map((option) => (
                    <option key={option.value} value={option.value} className="text-slate-900">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {type === 'PROPERTY_BOOST' && (
              <div className="space-y-2">
                <Label htmlFor="targetProperty" className="text-slate-700">Target property</Label>
                <select
                  id="targetProperty"
                  value={targetPropertyId}
                  onChange={(event) => setTargetPropertyId(event.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  <option value="" className="text-slate-900">Select property</option>
                  {propertyOptions.map((property) => (
                    <option key={property.id} value={property.id} className="text-slate-900">
                      {property.title}
                    </option>
                  ))}
                </select>
                {propertiesQuery.isLoading && (
                  <p className="text-xs text-slate-500">Loading properties...</p>
                )}
              </div>
            )}

            {type !== 'PROPERTY_BOOST' && (
              <div className="space-y-2">
                <Label htmlFor="placement" className="text-slate-700">Ad placement</Label>
                <select
                  id="placement"
                  value={placementId}
                  onChange={(event) => setPlacementId(event.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  <option value="" className="text-slate-900">Select placement</option>
                  {availablePlacements.map((placement: any) => (
                    <option key={placement.id} value={placement.id} className="text-slate-900">
                      {placement.name} • {placement.page} / {placement.position}
                    </option>
                  ))}
                </select>
                {placementsQuery.isLoading && (
                  <p className="text-xs text-slate-500">Loading placements...</p>
                )}
                {!placementsQuery.isLoading && availablePlacements.length === 0 && (
                  <p className="text-xs text-slate-500">No placements available for this campaign type.</p>
                )}
              </div>
            )}

            {type !== 'PROPERTY_BOOST' && (
              <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Ad creative</h3>
                    <p className="text-xs text-slate-500">Upload a banner or craft a text ad.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={creativeMode === 'new' ? 'default' : 'outline'}
                      onClick={() => setCreativeMode('new')}
                      className="h-8"
                    >
                      New creative
                    </Button>
                    <Button
                      type="button"
                      variant={creativeMode === 'existing' ? 'default' : 'outline'}
                      onClick={() => setCreativeMode('existing')}
                      className="h-8"
                    >
                      Use existing
                    </Button>
                  </div>
                </div>

                {creativeMode === 'existing' ? (
                  <div className="space-y-2">
                    <Label htmlFor="creativeSelect" className="text-slate-700">Select creative</Label>
                    <select
                      id="creativeSelect"
                      value={creativeId}
                      onChange={(event) => setCreativeId(event.target.value)}
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                    >
                      <option value="" className="text-slate-900">Choose creative</option>
                      {creatives.map((creative: any) => (
                        <option key={creative.id} value={creative.id} className="text-slate-900">
                          {creative.type} • {creative.width}x{creative.height}
                        </option>
                      ))}
                    </select>
                    {creativesQuery.isLoading && (
                      <p className="text-xs text-slate-500">Loading creatives...</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="creativeKind" className="text-slate-700">Creative type</Label>
                        <select
                          id="creativeKind"
                          value={creativeKind}
                          onChange={(event) => setCreativeKind(event.target.value as 'IMAGE' | 'HTML')}
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                        >
                          <option value="IMAGE" className="text-slate-900">Banner image</option>
                          <option value="HTML" className="text-slate-900">Text/HTML</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="creativeClickUrl" className="text-slate-700">Click URL</Label>
                        <Input
                          id="creativeClickUrl"
                          value={creativeClickUrl}
                          onChange={(event) => setCreativeClickUrl(event.target.value)}
                          placeholder="https://example.com"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="creativeWidth" className="text-slate-700">Width (px)</Label>
                        <Input
                          id="creativeWidth"
                          value={creativeWidth}
                          onChange={(event) => setCreativeWidth(event.target.value)}
                          type="number"
                          min="1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="creativeHeight" className="text-slate-700">Height (px)</Label>
                        <Input
                          id="creativeHeight"
                          value={creativeHeight}
                          onChange={(event) => setCreativeHeight(event.target.value)}
                          type="number"
                          min="1"
                        />
                      </div>
                    </div>

                    {creativeKind === 'IMAGE' ? (
                      <div className="space-y-2">
                        <Label htmlFor="creativeFile" className="text-slate-700">Banner image</Label>
                        <Input
                          id="creativeFile"
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(event) =>
                            setCreativeFile(event.target.files?.[0] ?? null)
                          }
                        />
                        <p className="text-xs text-slate-500">Recommended size: 1200x628 or 1600x900.</p>
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2 md:col-span-1">
                          <Label htmlFor="headline" className="text-slate-700">Headline</Label>
                          <Input
                            id="headline"
                            value={headline}
                            onChange={(event) => setHeadline(event.target.value)}
                            placeholder="Luxury apartments in Harare"
                          />
                        </div>
                        <div className="space-y-2 md:col-span-1">
                          <Label htmlFor="body" className="text-slate-700">Body copy</Label>
                          <Input
                            id="body"
                            value={body}
                            onChange={(event) => setBody(event.target.value)}
                            placeholder="Explore premium listings with verified agents."
                          />
                        </div>
                        <div className="space-y-2 md:col-span-1">
                          <Label htmlFor="cta" className="text-slate-700">CTA label</Label>
                          <Input
                            id="cta"
                            value={ctaLabel}
                            onChange={(event) => setCtaLabel(event.target.value)}
                            placeholder="Learn more"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startAt" className="text-slate-700">Start date</Label>
                <Input
                  id="startAt"
                  type="date"
                  value={startAt}
                  onChange={(event) => setStartAt(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endAt" className="text-slate-700">End date (optional)</Label>
                <Input
                  id="endAt"
                  type="date"
                  value={endAt}
                  onChange={(event) => setEndAt(event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="budget" className="text-slate-700">Total budget (USD)</Label>
                <Input
                  id="budget"
                  type="number"
                  min="0"
                  step="0.01"
                  value={budget}
                  onChange={(event) => setBudget(event.target.value)}
                  placeholder="100.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dailyCap" className="text-slate-700">Daily cap (USD)</Label>
                <Input
                  id="dailyCap"
                  type="number"
                  min="0"
                  step="0.01"
                  value={dailyCap}
                  onChange={(event) => setDailyCap(event.target.value)}
                  placeholder="10.00"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="dailyImpressions" className="text-slate-700">Daily impressions cap</Label>
                <Input
                  id="dailyImpressions"
                  type="number"
                  min="0"
                  step="1"
                  value={dailyImpressions}
                  onChange={(event) => setDailyImpressions(event.target.value)}
                  placeholder="2000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpm" className="text-slate-700">CPM (USD)</Label>
                <Input
                  id="cpm"
                  type="number"
                  min="0"
                  step="0.01"
                  value={cpm}
                  onChange={(event) => setCpm(event.target.value)}
                  placeholder="2.50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpc" className="text-slate-700">CPC (USD)</Label>
                <Input
                  id="cpc"
                  type="number"
                  min="0"
                  step="0.01"
                  value={cpc}
                  onChange={(event) => setCpc(event.target.value)}
                  placeholder="0.30"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard/advertiser/campaigns')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Campaign'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
