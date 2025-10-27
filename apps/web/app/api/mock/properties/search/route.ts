import { NextRequest, NextResponse } from 'next/server';
import { type PropertySearchResult } from '@propad/sdk';
import { mockProperties } from '../../data';

const MAX_PAGE_SIZE = 50;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const suburb = searchParams.get('suburb')?.toLowerCase();
  const type = searchParams.get('type')?.toLowerCase();
  const pageParam = Number.parseInt(searchParams.get('page') ?? '1', 10);
  const limitParam = Number.parseInt(searchParams.get('limit') ?? '18', 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const perPage = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, MAX_PAGE_SIZE) : 18;

  const filtered = mockProperties.filter((property) => {
    if (suburb) {
      const locationSuburb =
        property.suburbName ?? property.location.suburb?.name ?? undefined;
      if (!locationSuburb || locationSuburb.toLowerCase() !== suburb) {
        return false;
      }
    }

    if (type && property.type.toLowerCase() !== type) {
      return false;
    }

    return true;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * perPage;
  const items = filtered.slice(startIndex, startIndex + perPage);

  const prices = filtered.map((property) => property.price ?? 0);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

  const typeCounts = filtered.reduce<Record<string, number>>((acc, property) => {
    const key = property.type;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const suburbCounts = filtered.reduce<Record<string, { name: string | null; count: number }>>(
    (acc, property) => {
      const id = property.suburbId ?? property.location.suburbId ?? 'unknown';
      const name =
        property.suburbName ?? property.location.suburb?.name ?? property.cityName ?? 'Unknown';
      const existing = acc[id];
      if (existing) {
        existing.count += 1;
      } else {
        acc[id] = { name, count: 1 };
      }
      return acc;
    },
    {}
  );

  const payload: PropertySearchResult = {
    items,
    page: currentPage,
    perPage,
    total,
    totalPages,
    hasNextPage: currentPage < totalPages,
    facets: {
      price: {
        min: minPrice,
        max: maxPrice
      },
      types: Object.entries(typeCounts).map(([propertyType, count]) => ({
        type: propertyType,
        count
      })),
      suburbs: Object.entries(suburbCounts).map(([suburbId, value]) => ({
        suburbId,
        suburbName: value.name,
        count: value.count
      }))
    }
  };

  return NextResponse.json(payload);
}
