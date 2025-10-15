'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api-client';
import { useAdSession } from '@/lib/ad-session';
import clsx from 'clsx';

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

interface AdSlotProps {
  slotId?: string;
  layout?: string;
  format?: string;
  className?: string;
  propertyId?: string;
  source?: string;
}

const ADS_SCRIPT_SRC = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';

export function AdSlot({
  slotId = process.env.NEXT_PUBLIC_ADSENSE_FEED_SLOT,
  layout = 'in-article',
  format = 'fluid',
  className,
  propertyId,
  source
}: AdSlotProps) {
  const adRef = useRef<HTMLModElement | null>(null);
  const hasLoggedImpression = useRef(false);
  const sessionId = useAdSession();
  const [scriptReady, setScriptReady] = useState(false);
  const clientId = useMemo(() => process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID, []);

  useEffect(() => {
    if (!clientId) {
      return;
    }

    const existing = document.querySelector(`script[src^="${ADS_SCRIPT_SRC}"]`);
    if (existing) {
      setScriptReady(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `${ADS_SCRIPT_SRC}?client=${clientId}`;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => setScriptReady(true);
    document.head.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, [clientId]);

  useEffect(() => {
    if (!clientId || !scriptReady || !adRef.current) {
      return;
    }

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (error) {
      // Ignore push errors in development.
    }
  }, [clientId, scriptReady, slotId]);

  useEffect(() => {
    if (!adRef.current || !sessionId || hasLoggedImpression.current) {
      return;
    }

    const element = adRef.current;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!hasLoggedImpression.current && entry.isIntersecting && entry.intersectionRatio >= 0.4) {
          hasLoggedImpression.current = true;
          const route = typeof window !== 'undefined' ? window.location.pathname : '/';
          api.ads
            .logImpression({
              propertyId,
              route,
              sessionId,
              source: source ?? 'feed'
            })
            .catch(() => {
              hasLoggedImpression.current = false;
            });
        }
      });
    }, { threshold: [0.4] });

    observer.observe(element);

    return () => {
      observer.unobserve(element);
      observer.disconnect();
    };
  }, [propertyId, sessionId, source]);

  if (!clientId || !slotId) {
    return (
      <div
        className={clsx(
          'flex h-36 w-full items-center justify-center rounded-md border border-dashed border-neutral-300 bg-neutral-100 text-sm text-neutral-500',
          className
        )}
      >
        Advert slot placeholder
      </div>
    );
  }

  return (
    <ins
      className={clsx('adsbygoogle block overflow-hidden rounded-lg bg-white shadow-sm', className)}
      style={{ display: 'block' }}
      data-ad-client={clientId}
      data-ad-slot={slotId}
      data-ad-format={format}
      data-ad-layout={layout}
      ref={(element) => {
        adRef.current = element;
      }}
    />
  );
}
