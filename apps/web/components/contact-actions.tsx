'use client';

import { useCallback, useMemo, useState } from 'react';
import type { Property } from '@propad/sdk';
import { Button } from '@propad/ui';
import { api } from '@/lib/api-client';

interface ContactActionsProps {
  property: Property;
}

export function ContactActions({ property }: ContactActionsProps) {
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const location = useMemo(() => property.suburb ?? property.city, [property.city, property.suburb]);

  const ensureShortLink = useCallback(async () => {
    if (shortUrl) {
      return shortUrl;
    }

    if (typeof window === 'undefined') {
      return '';
    }

    setIsLoading(true);
    try {
      const targetUrl = `${window.location.origin}/listings/${property.id}`;
      const link = await api.shortlinks.create({
        targetUrl,
        propertyId: property.id,
        utmSource: 'whatsapp',
        utmMedium: 'web-detail',
        utmCampaign: 'whatsapp-share',
        utmContent: property.type,
        utmTerm: location ?? undefined
      });
      const url = `${window.location.origin}/s/${link.code}`;
      setShortUrl(url);
      return url;
    } finally {
      setIsLoading(false);
    }
  }, [location, property.id, property.type, shortUrl]);

  const handleWhatsApp = useCallback(async () => {
    const url = await ensureShortLink();
    if (!url) {
      return;
    }

    const message = encodeURIComponent(
      `Hi, I'm interested in the ${property.type.toLowerCase()} in ${location}. See details here: ${url}`
    );

    window.open(`https://wa.me/?text=${message}`, '_blank', 'noopener');
  }, [ensureShortLink, location, property.type]);

  const handleCopy = useCallback(async () => {
    const url = await ensureShortLink();
    if (!url || typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [ensureShortLink]);

  return (
    <div className="mt-4 grid gap-3">
      <Button onClick={handleWhatsApp} disabled={isLoading} className="w-full">
        {isLoading ? 'Preparing WhatsApp link…' : 'Message on WhatsApp'}
      </Button>
      <Button onClick={handleCopy} variant="secondary" disabled={isLoading} className="w-full">
        {copied ? 'Shortlink copied!' : 'Copy share shortlink'}
      </Button>
      {shortUrl ? <p className="text-xs text-neutral-500">Sharing URL: {shortUrl}</p> : null}
    </div>
  );
}
