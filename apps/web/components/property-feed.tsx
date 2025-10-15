'use client';

import { Fragment, useEffect, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Button, notify } from '@propad/ui';
import { PropertySearchResultSchema, type PropertySearchResult } from '@propad/sdk';
import { AdSlot } from './ad-slot';
import { PropertyCard } from './property-card';
import { PropertyFeedSkeleton } from './property-feed-skeleton';
import { EmptyState } from './empty-state';

interface PropertyFeedProps {
  initialPage: PropertySearchResult;
  filters: Record<string, string>;
}

function sanitizeFilters(filters: Record<string, string>) {
  const entries = Object.entries(filters)
    .filter(([, value]) => typeof value === 'string' && value.trim() !== '')
    .map(([key, value]) => [key, value.trim()]);

  entries.sort(([a], [b]) => a.localeCompare(b));

  return Object.fromEntries(entries);
}

async function requestProperties(
  params: URLSearchParams
): Promise<PropertySearchResult> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error('API base URL is not configured');
  }

  const response = await fetch(`${baseUrl}/properties/search?${params.toString()}`, {
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error('Failed to load property listings');
  }

  const json = await response.json();
  return PropertySearchResultSchema.parse(json);
}

export function PropertyFeed({ initialPage, filters }: PropertyFeedProps) {
  const perPage = Math.max(initialPage.perPage, 1);
  const sanitizedFilters = useMemo(() => sanitizeFilters(filters), [filters]);
  const filterKey = useMemo(() => JSON.stringify(sanitizedFilters), [sanitizedFilters]);

  const {
    data,
    status,
    error,
    fetchNextPage,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    isError
  } = useInfiniteQuery<PropertySearchResult>({
    queryKey: ['properties', filterKey, perPage],
    queryFn: async ({ pageParam = initialPage.page }) => {
      const params = new URLSearchParams(sanitizedFilters);
      params.set('page', pageParam.toString());
      params.set('limit', perPage.toString());
      return requestProperties(params);
    },
    initialData: {
      pages: [initialPage],
      pageParams: [initialPage.page]
    },
    initialPageParam: initialPage.page,
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.page + 1 : undefined),
    staleTime: 60_000
  });

  useEffect(() => {
    if (isError) {
      console.error(error);
      notify.error('We could not load more listings. Please try again.');
    }
  }, [isError, error]);

  if (status === 'loading' && !data) {
    return <PropertyFeedSkeleton cards={perPage} />;
  }

  const pages = data?.pages ?? [initialPage];
  const items = pages.flatMap((page) => page.items);
  const total = pages[0]?.total ?? 0;
  const hasResults = items.length > 0;
  const totalLabel = total === 1 ? 'listing' : 'listings';
  const listingLabel = items.length === 1 ? 'listing' : 'listings';

  if (isError && !hasResults) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <h2 className="text-lg font-semibold text-red-700">We couldn&apos;t load listings</h2>
        <p className="mt-2 text-sm text-red-600">Please check your connection and try again.</p>
        <div className="mt-4 flex justify-center">
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!hasResults) {
    return (
      <EmptyState
        title="No listings yet"
        description="We update the marketplace daily. Try adjusting your filters or check back soon."
      />
    );
  }

  return (
    <div className="grid gap-8">
      <div className="flex flex-col gap-2 text-sm text-neutral-600" aria-live="polite">
        <span className="font-medium text-neutral-800">{total} verified {totalLabel} available</span>
        <span>
          Showing {items.length} {listingLabel}.
        </span>
      </div>

      <AdSlot source="feed-top" className="mx-auto max-w-4xl" />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {items.map((property, index) => (
          <Fragment key={property.id}>
            <PropertyCard property={property} />
            {(index + 1) % 3 === 0 ? (
              <div className="md:col-span-2 xl:col-span-3" key={`${property.id}-ad-${index}`}>
                <AdSlot source="feed-inline" className="mx-auto max-w-4xl" />
              </div>
            ) : null}
          </Fragment>
        ))}
      </div>

      {hasNextPage ? (
        <div className="flex justify-center">
          <Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? 'Loading more listings…' : 'Load more listings'}
          </Button>
        </div>
      ) : (
        <p className="text-center text-sm text-neutral-500">You&apos;ve reached the end of the listings.</p>
      )}
    </div>
  );
}
