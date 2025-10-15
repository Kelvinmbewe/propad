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
    if (suburb && property.suburb?.toLowerCase() !== suburb) {
      return false;
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

  const payload: PropertySearchResult = {
    items,
    page: currentPage,
    perPage,
    total,
    totalPages,
    hasNextPage: currentPage < totalPages
  };

  return NextResponse.json(payload);
}
