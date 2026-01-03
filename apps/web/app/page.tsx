import nextDynamic from 'next/dynamic';
import { LandingNav } from '@/components/landing-nav';
import { LandingHero, type FloatingHeroCard } from '@/components/landing-hero';
import { LandingPropertyCard, type LandingProperty } from '@/components/landing-property-card';
import { LandingAuroraPalette } from '@/components/landing-aurora-palette';
import { Instagram, Linkedin, Twitter } from 'lucide-react';
import type { LandingMapSectionProps } from '@/components/landing-map-section';

const LandingMapSection = nextDynamic<LandingMapSectionProps>(
  () => import('@/components/landing-map-section').then((mod) => mod.LandingMapSection),
  { ssr: false }
);

export const dynamic = 'force-dynamic';

interface ShowcaseProperty extends LandingProperty {
  coordinates: [number, number];
}

const heroCards: FloatingHeroCard[] = [
  {
    accent: 'CURATED AGENTS',
    title: 'Verified storytellers',
    description: 'Partnered agents trained on PropAd showing rituals and concierge-style onboarding.'
  },
  {
    accent: 'SEAMLESS JOURNEY',
    title: 'Framer powered motion',
    description: 'Micro-animations guide renters from enquiry to offer with zero static friction.'
  },
  {
    accent: 'MARKET INTELLIGENCE',
    title: 'Live rate telemetry',
    description: 'Pricing heatmaps pull from PropAd market data to keep valuations precise and aspirational.'
  }
];

import { prisma } from '@/lib/prisma';

// ... (keep imports)

async function getFeaturedProperties(): Promise<ShowcaseProperty[]> {
  try {
    const properties = await prisma.property.findMany({
      where: {
        status: 'VERIFIED'
      },
      take: 6,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        media: true,
        city: true,
        suburb: true
      }
    });

    return properties.map((p: any) => ({
      id: p.id,
      title: p.title,
      location: `${p.suburb?.name || 'Harare'}, ${p.city?.name || 'Zimbabwe'}`,
      price: p.currency === 'USD' ? `US$${p.price.toLocaleString()}` : `ZWL$${p.price.toLocaleString()}`,
      status: p.type === 'RESIDENTIAL_SALE' ? 'FOR SALE' : 'FOR RENT',
      statusTone: p.type === 'RESIDENTIAL_SALE' ? 'sale' : 'rent',
      imageUrl: p.media[0]?.url || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
      beds: p.bedrooms || 0,
      baths: p.bathrooms || 0,
      area: 0, // Field missing in schema
      coordinates: (p.lat && p.lng) ? [p.lat, p.lng] : [-17.8216, 31.0492]
    })) as ShowcaseProperty[];
  } catch (error) {
    console.error('Failed to fetch featured properties:', error);
    // Return empty array instead of throwing
    return [];
  }
}

export default async function HomePage() {
  const showcaseProperties = await getFeaturedProperties();

  return (
    <div className="relative">
      <LandingNav />
      <main className="flex flex-col gap-24 pb-24 pt-32">
        <LandingHero cards={heroCards} />

        <LandingAuroraPalette />

        <section
          id="listings"
          className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 sm:px-12 lg:px-16"
        >
          <div className="flex flex-col gap-4">
            <span className="text-xs uppercase tracking-[0.35em] text-emerald-500">Signature portfolio</span>
            <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
              Featured addresses crafted for modern Zimbabwean living
            </h2>
            <p className="max-w-2xl text-base text-slate-600">
              Cinematic cards reveal the essentials at a glance. Tap through to unlock immersive tours, agent
              chat, and PropAd verified documentation.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {showcaseProperties.map((property) => (
              <LandingPropertyCard key={property.id} property={property} />
            ))}
          </div>

        </section>

        <LandingMapSection properties={showcaseProperties} />
      </main>

      <footer
        id="contact"
        className="mt-16 bg-gradient-to-br from-slate-950 via-emerald-900 to-cyan-900 py-12 text-white"
      >
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 sm:flex-row sm:items-center sm:justify-between sm:px-12 lg:px-16">
          <div className="flex flex-col gap-2">
            <p className="text-sm uppercase tracking-[0.35em] text-emerald-200">PropAd Zimbabwe</p>
            <p className="text-lg font-semibold">Aspirational real estate, choreographed end-to-end.</p>
            <p className="text-sm text-emerald-100/80">hello@propad.co.zw · +263 77 000 1234</p>
          </div>
          <div className="flex flex-col items-start gap-4 text-sm text-emerald-100/80 sm:items-end">
            <div className="flex items-center gap-3">
              <a href="https://twitter.com" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="https://instagram.com" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="https://linkedin.com" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20">
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
            <p className="text-xs">© {new Date().getFullYear()} PropAd. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
