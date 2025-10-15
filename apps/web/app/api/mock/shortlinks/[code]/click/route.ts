import { NextResponse } from 'next/server';
import { ShortLinkSchema } from '@propad/sdk';
import { getShortLink, recordShortLinkClick } from '../../../data';

interface Params {
  params: { code: string };
}

export async function POST(_: Request, { params }: Params) {
  const shortLink = getShortLink(params.code);

  if (!shortLink) {
    return NextResponse.json({ message: 'Shortlink not found' }, { status: 404 });
  }

  recordShortLinkClick(params.code);
  return NextResponse.json(ShortLinkSchema.parse(shortLink));
}
