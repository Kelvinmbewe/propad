'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowRight,
  BellDot,
  Clock3,
  Loader2,
  Search,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@propad/ui';
import { formatDistanceToNowStrict } from 'date-fns';
import { formatDealTypeLabel, resolveDealTypeFromValue } from '@/lib/deal-type';

type QueueDeal = {
  id: string;
  propertyId: string;
  dealType?: string | null;
  stage: string;
  status: string;
  nextAction: string;
  unread: boolean;
  overdue: boolean;
  updatedAt: string;
  property?: { id: string; title?: string | null } | null;
  tenant?: { id: string; name?: string | null; email?: string | null } | null;
  landlord?: { id: string; name?: string | null; email?: string | null } | null;
};

const DEAL_TYPES = ['ALL', 'RENT', 'SALE'] as const;

type QueueResponse = {
  items: QueueDeal[];
  total: number;
  stats: { unread: number; overdue: number };
};

const STAGES = [
  'ALL',
  'DRAFT',
  'TERMS_SET',
  'CONTRACT_READY',
  'SENT',
  'SIGNING',
  'SIGNED',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
] as const;

const stageBadgeClass: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-800',
  TERMS_SET: 'bg-amber-100 text-amber-800',
  CONTRACT_READY: 'bg-sky-100 text-sky-800',
  SENT: 'bg-indigo-100 text-indigo-800',
  SIGNING: 'bg-violet-100 text-violet-800',
  SIGNED: 'bg-blue-100 text-blue-800',
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-zinc-100 text-zinc-700',
};

const stageLabel = (stage: string) => stage.replaceAll('_', ' ').toLowerCase();

async function fetchQueue(q: string, stage: string): Promise<QueueResponse> {
  const search = new URLSearchParams();
  if (q.trim()) search.set('q', q.trim());
  if (stage !== 'ALL') search.set('stage', stage);
  search.set('take', '200');

  const response = await fetch(`/api/deals/queue?${search.toString()}`, {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    const json = await response.json().catch(() => ({}));
    throw new Error(json?.error || 'Failed to load deals queue');
  }

  return response.json();
}

export default function DealsPage() {
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState<(typeof STAGES)[number]>('ALL');
  const [dealType, setDealType] = useState<(typeof DEAL_TYPES)[number]>('ALL');

  const queueQuery = useQuery({
    queryKey: ['deals', 'queue', query, stage],
    queryFn: () => fetchQueue(query, stage),
  });

  const items = queueQuery.data?.items ?? [];
  const stats = queueQuery.data?.stats ?? { unread: 0, overdue: 0 };

  const orderedItems = useMemo(() => {
    const filtered =
      dealType === 'ALL'
        ? items
        : items.filter((item) => resolveDealTypeFromValue(item.dealType) === dealType);

    return [...filtered].sort((a, b) => {
      const score = (deal: QueueDeal) =>
        (deal.overdue ? 100 : 0) + (deal.unread ? 10 : 0);
      return score(b) - score(a);
    });
  }, [dealType, items]);

  const handleSearch = () => setQuery(searchInput);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Deals Queue</h1>
          <p className="text-sm text-muted-foreground">
            Prioritized work queue for terms, contracts, signatures, and
            activation.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <BellDot className="h-3.5 w-3.5" />
          <span>{stats.unread} unread</span>
          <Clock3 className="h-3.5 w-3.5 ml-2" />
          <span>{stats.overdue} overdue</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Search by participant or listing title and narrow by stage/type.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchInput}
              placeholder="Search deals..."
              className="pl-9"
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleSearch();
              }}
            />
          </div>
          <div className="w-full md:w-64">
            <Select
              value={stage}
              onValueChange={(value) => setStage(value as (typeof STAGES)[number])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                {STAGES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value === 'ALL' ? 'All stages' : stageLabel(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-40">
            <Select
              value={dealType}
              onValueChange={(value) =>
                setDealType(value as (typeof DEAL_TYPES)[number])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {DEAL_TYPES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value === 'ALL' ? 'All types' : formatDealTypeLabel(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSearch}>Apply</Button>
        </CardContent>
      </Card>

      {queueQuery.isLoading ? (
        <div className="flex justify-center p-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : queueQuery.error ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-red-600">
            {(queueQuery.error as Error).message}
          </CardContent>
        </Card>
      ) : orderedItems.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No deals in this queue view.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orderedItems.map((deal) => (
            <Card key={deal.id}>
              <CardContent className="py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/properties/${deal.propertyId}`}
                        className="font-semibold hover:underline"
                      >
                        {deal.property?.title || `Property ${deal.propertyId}`}
                      </Link>
                      <Badge
                        className={
                          stageBadgeClass[deal.stage] || 'bg-slate-100 text-slate-700'
                        }
                      >
                        {stageLabel(deal.stage)}
                      </Badge>
                      <Badge variant="secondary">
                        {formatDealTypeLabel(deal.dealType)}
                      </Badge>
                      {deal.unread ? <Badge variant="outline">Unread</Badge> : null}
                      {deal.overdue ? (
                        <Badge className="bg-rose-100 text-rose-700">Overdue</Badge>
                      ) : null}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Tenant: {deal.tenant?.name || deal.tenant?.email || 'Unknown'}
                      {' · '}
                      Landlord:{' '}
                      {deal.landlord?.name || deal.landlord?.email || 'Unknown'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Updated{' '}
                      {formatDistanceToNowStrict(new Date(deal.updatedAt), {
                        addSuffix: true,
                      })}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <div className="inline-flex items-center rounded-md border px-2.5 py-1 text-xs text-muted-foreground">
                      <AlertCircle className="mr-1.5 h-3.5 w-3.5" />
                      Next: {deal.nextAction}
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/dashboard/deals/${deal.id}/contract`}>
                        Open Contract <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
