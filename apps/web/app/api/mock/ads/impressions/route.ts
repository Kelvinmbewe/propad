import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { AdImpressionSchema, type AdImpression } from '@propad/sdk';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const payload: AdImpression = {
    id: randomUUID(),
    propertyId: body.propertyId ?? null,
    userId: null,
    route: body.route ?? '/',
    source: body.source ?? 'mock',
    sessionId: body.sessionId ?? randomUUID(),
    revenueMicros: 0,
    createdAt: new Date().toISOString()
  };

  return NextResponse.json(AdImpressionSchema.parse(payload));
}
