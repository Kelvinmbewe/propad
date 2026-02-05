"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import { useAdSession } from "@/lib/ad-session";
import clsx from "clsx";

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

interface InhouseAd {
  id?: string;
  title: string;
  body?: string;
  ctaLabel?: string;
  href?: string;
  tone?: "emerald" | "cyan" | "slate";
}

interface AdSlotProps {
  slotId?: string;
  layout?: string;
  format?: string;
  className?: string;
  propertyId?: string;
  source?: string;
  adsenseEnabled?: boolean;
  unitId?: string;
  fallbackInhouseAds?: InhouseAd[];
}

const ADS_SCRIPT_SRC =
  "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";

export function AdSlot({
  slotId = process.env.NEXT_PUBLIC_ADSENSE_FEED_SLOT,
  layout = "in-article",
  format = "fluid",
  className,
  propertyId,
  source,
  adsenseEnabled,
  unitId,
  fallbackInhouseAds,
}: AdSlotProps) {
  const adRef = useRef<HTMLModElement | null>(null);
  const hasLoggedImpression = useRef(false);
  const sessionId = useAdSession();
  const [scriptReady, setScriptReady] = useState(false);
  const clientId = useMemo(() => process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID, []);
  const resolvedSlotId = unitId ?? slotId;
  const isAdsenseEnabled =
    adsenseEnabled ?? Boolean(clientId && resolvedSlotId);
  const fallbackAd = useMemo(() => {
    if (!fallbackInhouseAds || fallbackInhouseAds.length === 0) {
      return null;
    }
    const index = source
      ? Math.abs(
          source.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0),
        ) % fallbackInhouseAds.length
      : 0;
    return fallbackInhouseAds[index];
  }, [fallbackInhouseAds, source]);

  useEffect(() => {
    if (!clientId || !isAdsenseEnabled || !resolvedSlotId) {
      return;
    }

    const existing = document.querySelector(`script[src^="${ADS_SCRIPT_SRC}"]`);
    if (existing) {
      setScriptReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = `${ADS_SCRIPT_SRC}?client=${clientId}`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => setScriptReady(true);
    document.head.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, [clientId, isAdsenseEnabled, resolvedSlotId]);

  useEffect(() => {
    if (!clientId || !scriptReady || !adRef.current || !isAdsenseEnabled) {
      return;
    }

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (error) {
      // Ignore push errors in development.
    }
  }, [clientId, scriptReady, resolvedSlotId, isAdsenseEnabled]);

  useEffect(() => {
    if (!adRef.current || !sessionId || hasLoggedImpression.current) {
      return;
    }

    const element = adRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (
            !hasLoggedImpression.current &&
            entry.isIntersecting &&
            entry.intersectionRatio >= 0.4
          ) {
            hasLoggedImpression.current = true;
            const route =
              typeof window !== "undefined" ? window.location.pathname : "/";
            api.ads
              .logImpression({
                propertyId,
                route,
                sessionId,
                source: source ?? "feed",
              })
              .catch(() => {
                hasLoggedImpression.current = false;
              });
          }
        });
      },
      { threshold: [0.4] },
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
      observer.disconnect();
    };
  }, [propertyId, sessionId, source]);

  if (!clientId || !resolvedSlotId || !isAdsenseEnabled) {
    if (fallbackAd) {
      return (
        <div
          className={clsx(
            "flex w-full flex-col gap-3 rounded-2xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/40 to-cyan-50/40 p-5 text-sm text-slate-700 shadow-sm",
            fallbackAd.tone === "cyan" &&
              "border-cyan-100 from-white via-cyan-50/40 to-emerald-50/20",
            fallbackAd.tone === "slate" &&
              "border-slate-200 from-white via-slate-50/60 to-slate-100/40",
            className,
          )}
        >
          <p className="text-xs uppercase tracking-[0.35em] text-emerald-400">
            Sponsor
          </p>
          <div className="flex flex-col gap-2">
            <p className="text-base font-semibold text-slate-900">
              {fallbackAd.title}
            </p>
            {fallbackAd.body ? (
              <p className="text-sm text-slate-600">{fallbackAd.body}</p>
            ) : null}
          </div>
          {fallbackAd.href ? (
            <a
              href={fallbackAd.href}
              className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50"
            >
              {fallbackAd.ctaLabel ?? "Learn more"}
            </a>
          ) : null}
        </div>
      );
    }

    return (
      <div
        className={clsx(
          "flex h-36 w-full items-center justify-center rounded-md border border-dashed border-neutral-300 bg-neutral-100 text-sm text-neutral-500",
          className,
        )}
      >
        Advert slot placeholder
      </div>
    );
  }

  return (
    <ins
      className={clsx(
        "adsbygoogle block overflow-hidden rounded-lg bg-white shadow-sm",
        className,
      )}
      style={{ display: "block" }}
      data-ad-client={clientId}
      data-ad-slot={resolvedSlotId}
      data-ad-format={format}
      data-ad-layout={layout}
      ref={(element) => {
        adRef.current = element;
      }}
    />
  );
}
