import { NextRequest, NextResponse } from 'next/server';
import { ShortLinkSchema } from '@propad/sdk';
import { createShortLink } from '../data';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const shortLink = createShortLink(body.targetUrl ?? 'https://propad.local', body.propertyId ?? null);
  return NextResponse.json(ShortLinkSchema.parse(shortLink));
}
