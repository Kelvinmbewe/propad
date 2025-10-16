import { Metadata } from 'next';
import { Compass, Map, MapPin, PencilRuler, ShieldCheck } from 'lucide-react';
import { LandingNav } from '@/components/landing-nav';
import { LandingMapSection } from '@/components/landing-map-section';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@propad/ui';

export const metadata: Metadata = {
  title: 'Interactive Map | PropAd',
  description: 'Explore PropAd listings on an interactive map with draw-to-search tools and neighbourhood intelligence.'
};

const mapShowcase = [
  {
    id: 'borrowdale-ridge',
    title: 'Borrowdale Ridge Estate',
    location: 'Borrowdale, Harare',
    price: 'US$420,000',
    status: 'FOR SALE',
    statusTone: 'sale' as const,
    imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
    beds: 4,
    baths: 3,
    area: 365,
    coordinates: [-17.7605, 31.0944] as [number, number]
  },
  {
    id: 'avondale-lofts',
    title: 'Avondale Skyline Lofts',
    location: 'Avondale, Harare',
    price: 'US$1,150/mo',
    status: 'FOR RENT',
    statusTone: 'rent' as const,
    imageUrl: 'https://images.unsplash.com/photo-1502673530728-f79b4cab31b1?auto=format&fit=crop&w=1200&q=80',
    beds: 2,
    baths: 2,
    area: 168,
    coordinates: [-17.7894, 31.0463] as [number, number]
  },
  {
    id: 'umwinsidale-oasis',
    title: 'Umwinsidale Oasis',
    location: 'Umwinsidale, Harare',
    price: 'US$3,400/mo',
    status: 'FOR RENT',
    statusTone: 'rent' as const,
    imageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
    beds: 5,
    baths: 4,
    area: 420,
    coordinates: [-17.7376, 31.135] as [number, number]
  }
];

const featureCards = [
  {
    title: 'Draw-to-search capture',
    description: 'Sketch a polygon around Borrowdale or Mount Pleasant to filter listings to hyper-local footprints.',
    icon: PencilRuler
  },
  {
    title: 'Smart clustering',
    description: 'Pins expand into rich cards as you zoom, keeping the interface accessible on phones and tablets.',
    icon: Map
  },
  {
    title: 'Neighbourhood telemetry',
    description: 'Layers show schools, commute times, and fibre coverage so relocations stay fully informed.',
    icon: Compass
  }
];

const safetyHighlights = [
  {
    title: 'Agent verified photos',
    description: 'Every pin is backed by a PropAd agent inspection with geo-stamped media.',
    icon: ShieldCheck
  },
  {
    title: 'Trusted property IDs',
    description: 'Listings map directly to PropAd IDs, making it effortless to share deep links with clients.',
    icon: MapPin
  }
];

export default function MapPage() {
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-aurora-background via-white to-aurora-surface dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <LandingNav />
      <main className="flex flex-col gap-20 pb-24 pt-32">
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 sm:px-12 lg:px-16">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[color:var(--aurora-color-elevated)]/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-aurora-text-subtle shadow-aurora">
            <MapPin className="h-3.5 w-3.5" /> Map intelligence
          </span>
          <h1 className="text-4xl font-semibold text-aurora-text md:text-5xl">
            Draw, explore, and shortlist addresses without leaving the Aurora canvas.
          </h1>
          <p className="max-w-2xl text-base text-aurora-text-muted md:text-lg">
            The PropAd explorer blends Leaflet clustering with Aurora tokens so every interaction stays accessible. Switch to dark
            mode or mobile view and the interface adapts instantly.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button className="rounded-full bg-[color:var(--aurora-color-primary)] px-6 text-[color:var(--aurora-color-primary-on)] shadow-aurora hover:shadow-auroraBold">
              Launch explorer
            </Button>
            <Button variant="outline" className="rounded-full border-aurora-border bg-white/70 text-aurora-text hover:border-aurora-accent hover:text-aurora-accent">
              View map changelog
            </Button>
          </div>
        </section>

        <LandingMapSection properties={mapShowcase} />

        <section className="mx-auto w-full max-w-6xl px-6 sm:px-12 lg:px-16">
          <div className="grid gap-6 md:grid-cols-3">
            {featureCards.map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.title} className="h-full rounded-3xl border border-aurora-border bg-white/80 shadow-aurora dark:bg-slate-950/70">
                  <CardHeader className="flex flex-col gap-3">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-aurora-primary/20 via-aurora-secondary/20 to-aurora-accent/20 text-aurora-accent">
                      <Icon className="h-6 w-6" />
                    </span>
                    <div>
                      <CardTitle className="text-lg text-aurora-text">{card.title}</CardTitle>
                      <p className="mt-2 text-sm text-aurora-text-muted">{card.description}</p>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 sm:px-12 lg:px-16">
          <div className="grid gap-6 rounded-[32px] border border-aurora-border bg-white/80 p-8 shadow-aurora dark:bg-slate-950/70 md:grid-cols-2">
            {safetyHighlights.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="rounded-3xl border border-transparent bg-white/70 shadow-none dark:bg-slate-950/60">
                  <CardHeader className="flex flex-row items-center gap-4">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--aurora-color-accent)]/10 text-[color:var(--aurora-color-accent)]">
                      <Icon className="h-6 w-6" />
                    </span>
                    <div>
                      <CardTitle className="text-lg text-aurora-text">{item.title}</CardTitle>
                      <p className="mt-1 text-sm text-aurora-text-muted">{item.description}</p>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
            <Card className="rounded-3xl border border-aurora-border bg-[color:var(--aurora-color-elevated)]/90 shadow-aurora">
              <CardHeader>
                <CardTitle className="text-lg text-aurora-text">Mobile ready by default</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-aurora-text-muted">
                <p>
                  The explorer recalibrates clustering, typography, and hit areas based on viewport. That keeps contrast and
                  interaction targets compliant with 4.5:1 ratios even in bright Zimbabwean daylight.
                </p>
                <p>
                  Tablet view surfaces draw tools and filters in a single column, while the dark theme switches to luminous
                  overlays for nighttime showings.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
