import {
  AuroraFeatureCard,
  AuroraHero,
  AuroraPropertyCard,
  AuroraThemeToggle,
  AuroraPerformanceChart,
  AuroraMetricCard
} from '@propad/ui';
import { Building2, Compass, Sparkles } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="relative mx-auto flex min-h-screen max-w-6xl flex-col gap-16 px-4 py-16 md:gap-20">
      <div className="flex justify-end">
        <AuroraThemeToggle />
      </div>

      <AuroraHero
        title="Zimbabwe's elevated real-estate experience"
        subtitle="Aurora blends cinematic imagery with clean, data-rich surfaces so every property story feels premium and every workflow feels effortless."
        ctaPrimary={{ label: 'Launch tenant journey', href: '/auth/login' }}
        ctaSecondary={{ label: 'Explore property map', href: '/listings' }}
        imageUrl="https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=80"
      />

      <section className="grid gap-6 md:grid-cols-3">
        <AuroraFeatureCard
          title="Immersive showcases"
          description="Hero-ready imagery, 3D-ready card ratios, and glassmorphism overlays create a cinematic property canvas."
          icon={<Sparkles className="h-6 w-6" />}
        />
        <AuroraFeatureCard
          title="Trust by design"
          description="WCAG-compliant contrast, badge states, and audit trails reassure renters and compliance teams alike."
          icon={<ShieldIcon />}
        />
        <AuroraFeatureCard
          title="Adaptive workflows"
          description="From marketing to admin ops, Aurora keeps typography, spacing, and data viz aligned across every surface."
          icon={<Compass className="h-6 w-6" />}
        />
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {showcaseProperties.map((property) => (
          <AuroraPropertyCard key={property.title} {...property} />
        ))}
      </section>

      <section className="grid gap-6 rounded-[32px] border border-[color:var(--aurora-color-border)] bg-[color:var(--aurora-color-elevated)] p-8 shadow-aurora md:grid-cols-[1fr_1.1fr] md:p-12">
        <div className="flex flex-col gap-6">
          <h2 className="text-3xl font-semibold text-[color:var(--aurora-color-text)]">Admin clarity without clutter</h2>
          <p className="text-base text-[color:var(--aurora-color-text-muted)]">
            Aurora's backend theme mirrors the public brand while introducing structured density, rich charts, and elevated modals so finance, geo, and compliance teams can work faster.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <AuroraMetricCard label="Verified payouts" value="$426k" delta="+18%" trend="up" tone="accent" />
            <AuroraMetricCard label="Fraud blocks" value="24" delta="-32%" trend="down" tone="success" />
          </div>
        </div>
        <AuroraPerformanceChart title="Operational readiness" description="Live telemetry across payout approvals, compliance strikes, and viewing feedback." />
      </section>
    </main>
  );
}

const showcaseProperties = [
  {
    title: 'Vantage Towers · Borrowdale',
    price: 'US$1,850/mo',
    location: 'Panoramic CBD skyline · 3 Bed',
    imageUrl: 'https://images.unsplash.com/photo-1515263487990-61b07816b324?auto=format&fit=crop&w=900&q=80',
    badges: [
      { label: 'New to market' },
      { label: 'Furnished', tone: 'success' }
    ]
  },
  {
    title: 'Umwinsidale Manor',
    price: 'US$3,400/mo',
    location: '6 Bed · Solar microgrid · Acre plot',
    imageUrl: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=80',
    badges: [
      { label: 'Verified agent' },
      { label: 'Viewings open', tone: 'warning' }
    ]
  },
  {
    title: 'Tranquil Mews · Avondale',
    price: 'US$980/mo',
    location: 'Loft duplex · Rooftop braai terrace',
    imageUrl: 'https://images.unsplash.com/photo-1520256862855-398228c41684?auto=format&fit=crop&w=900&q=80',
    badges: [
      { label: '360° tour' },
      { label: 'Smart lock', tone: 'success' }
    ]
  }
];

function ShieldIcon() {
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--aurora-color-accent)]/10 text-[color:var(--aurora-color-accent)]">
      <Building2 className="h-4 w-4" />
    </span>
  );
}
