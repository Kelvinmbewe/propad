import { NextResponse } from 'next/server';
import { ShortLinkSchema } from '@propad/sdk';
import { getShortLink } from '../../data';

interface Params {
  params: { code: string };
}

export async function GET(_: Request, { params }: Params) {
  const shortLink = getShortLink(params.code);

  if (!shortLink) {
    return NextResponse.json({ message: 'Shortlink not found' }, { status: 404 });
  }

  return NextResponse.json(ShortLinkSchema.parse(shortLink));
}
