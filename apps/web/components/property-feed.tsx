'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Button, notify } from '@propad/ui';
import { PropertySearchResultSchema, type PropertySearchResult, type GeoSuburb } from '@propad/sdk';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AdSlot } from './ad-slot';
import { PropertyCard } from './property-card';
import { PropertyFeedSkeleton } from './property-feed-skeleton';
import { EmptyState } from './empty-state';
import { PropertyMap, type MapBounds } from './property-map';
import { api } from '@/lib/api-client';

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

function parseBoundsString(value: string | undefined): MapBounds | undefined {
  if (!value) {
    return undefined;
  }

  const parts = value.split(',').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return undefined;
  }

  const [swLat, swLng, neLat, neLng] = parts as [number, number, number, number];
  return {
    southWest: { lat: swLat, lng: swLng },
    northEast: { lat: neLat, lng: neLng }
  };
}

export function PropertyFeed({ initialPage, filters }: PropertyFeedProps) {
  const router = useRouter();
  const pathname = usePathname();
  const perPage = Math.max(initialPage.perPage, 1);

  const initialSanitized = useMemo(() => sanitizeFilters(filters), [filters]);
  const initialFilterKey = useMemo(() => JSON.stringify(initialSanitized), [initialSanitized]);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>(initialSanitized);
  const filterKey = useMemo(() => JSON.stringify(activeFilters), [activeFilters]);

  useEffect(() => {
    setActiveFilters(initialSanitized);
  }, [initialFilterKey, initialSanitized]);

  const updateUrl = useCallback(
    (nextFilters: Record<string, string>) => {
      const params = new URLSearchParams(nextFilters);
      const search = params.toString();
      router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
    },
    [pathname, router]
  );

  const applyFilters = useCallback(
    (updater: (prev: Record<string, string>) => Record<string, string>) => {
      setActiveFilters((prev) => {
        const next = sanitizeFilters(updater(prev));
        updateUrl(next);
        return next;
      });
    },
    [updateUrl]
  );

  const queryInitialData = filterKey === initialFilterKey
    ? { pages: [initialPage], pageParams: [initialPage.page] }
    : undefined;

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
      const nextPage = Number.isFinite(pageParam as number)
        ? Number(pageParam)
        : initialPage.page;
      const params = new URLSearchParams(activeFilters);
      params.set('page', nextPage.toString());
      params.set('limit', perPage.toString());
      return requestProperties(params);
    },
    initialData: queryInitialData,
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

  const { data: suburbsData } = useQuery<GeoSuburb[]>({
    queryKey: ['geo', 'suburbs'],
    queryFn: () => api.geo.suburbs(),
    staleTime: 1000 * 60 * 60
  });

  const suburbs = suburbsData ?? [];

  const pages = data?.pages ?? [initialPage];
  const items = pages.flatMap((page) => page.items);
  const total = pages[0]?.total ?? 0;
  const hasResults = items.length > 0;
  const totalLabel = total === 1 ? 'listing' : 'listings';
  const listingLabel = items.length === 1 ? 'listing' : 'listings';

  const activeBounds = useMemo(() => parseBoundsString(activeFilters.bounds), [activeFilters.bounds]);
  const activeSuburb = activeFilters.suburb ?? null;

  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);

  useEffect(() => {
    setHoveredPropertyId(null);
  }, [filterKey]);

  const handleMarkerHover = useCallback((propertyId: string | null) => {
    setHoveredPropertyId(propertyId);
  }, []);

  const handleBoundsSearch = useCallback(
    (bounds: MapBounds) => {
      applyFilters((prev) => {
        const next = { ...prev };
        next.bounds = [
          bounds.southWest.lat.toFixed(6),
          bounds.southWest.lng.toFixed(6),
          bounds.northEast.lat.toFixed(6),
          bounds.northEast.lng.toFixed(6)
        ].join(',');
        delete next.suburb;
        return next;
      });
    },
    [applyFilters]
  );

  const handleSuburbSelect = useCallback(
    (suburb: GeoSuburb) => {
      applyFilters((prev) => {
        const next = { ...prev };
        next.suburb = suburb.name;
        next.city = suburb.city;
        delete next.bounds;
        return next;
      });
    },
    [applyFilters]
  );

  const handleCardEnter = useCallback((propertyId: string) => {
    setHoveredPropertyId(propertyId);
  }, []);

  const handleCardLeave = useCallback((propertyId: string) => {
    setHoveredPropertyId((current) => (current === propertyId ? null : current));
  }, []);

  if (status === 'pending' && !data) {
    return <PropertyFeedSkeleton cards={perPage} />;
  }

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

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeInOut', delay: 0.05 }}
        className="order-2 flex flex-col gap-6 lg:order-1"
      >
        <div className="flex flex-col gap-2 text-sm text-neutral-600" aria-live="polite">
          <span className="font-medium text-neutral-800">{total} verified {totalLabel} available</span>
          <span>
            Showing {items.length} {listingLabel}.
          </span>
        </div>

        {hasResults ? (
          <>
            <AdSlot source="feed-top" className="mx-auto max-w-4xl" />

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {items.map((property, index) => (
                <Fragment key={property.id}>
                  <div
                    onMouseEnter={() => handleCardEnter(property.id)}
                    onMouseLeave={() => handleCardLeave(property.id)}
                    onFocus={() => handleCardEnter(property.id)}
                    onBlur={() => handleCardLeave(property.id)}
                    className="focus-within:outline-none"
                  >
                    <PropertyCard
                      property={property}
                      highlighted={hoveredPropertyId === property.id}
                      appearanceOrder={index}
                    />
                  </div>
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
          </>
        ) : (
          <EmptyState
            title="No listings yet"
            description="Try drawing a new area on the map or selecting a nearby suburb to broaden your search."
          />
        )}
      </motion.div>

      <motion.aside
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeInOut', delay: 0.1 }}
        className="order-1 lg:order-2 lg:pl-4 lg:pt-2"
      >
        <PropertyMap
          properties={items}
          suburbs={suburbs}
          hoveredPropertyId={hoveredPropertyId}
          activeSuburb={activeSuburb}
          activeBounds={activeBounds}
          onHoverMarker={handleMarkerHover}
          onBoundsSearch={handleBoundsSearch}
          onSuburbSelect={handleSuburbSelect}
        />
      </motion.aside>
    </motion.section>
  );
}
