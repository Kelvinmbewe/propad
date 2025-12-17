import { NextRequest, NextResponse } from 'next/server';
import { getServerApiBaseUrl } from '@propad/config';
import { ShortLinkSchema } from '@propad/sdk';

export async function GET(request: NextRequest, { params }: { params: { code: string } }) {
  const apiBase = getServerApiBaseUrl();
  const { code } = params;

  try {
    const shortLinkResponse = await fetch(`${apiBase}/shortlinks/${code}`, { cache: 'no-store' });
    if (!shortLinkResponse.ok) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    const shortLink = ShortLinkSchema.parse(await shortLinkResponse.json());

    await fetch(`${apiBase}/shortlinks/${code}/click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelRef: request.nextUrl.searchParams.get('ref') ?? undefined,
        contactPhone: request.nextUrl.searchParams.get('phone') ?? undefined
      })
    });

    return NextResponse.redirect(shortLink.targetUrl, { status: 307 });
  } catch (error) {
    return NextResponse.redirect(new URL('/', request.url));
  }
}
