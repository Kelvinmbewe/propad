import { ReactNode } from 'react';
import { cn } from '../../utils';
import { auroraGradientBackground } from '../aurora-tokens';

type AuroraHeroProps = {
  title: string;
  subtitle: string;
  ctaPrimary: { label: string; href: string };
  ctaSecondary: { label: string; href: string };
  imageUrl: string;
};

export function AuroraHero({ title, subtitle, ctaPrimary, ctaSecondary, imageUrl }: AuroraHeroProps) {
  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-[color:var(--aurora-color-border)] bg-[color:var(--aurora-color-elevated)] p-8 shadow-aurora md:p-12"
      style={{ backgroundImage: auroraGradientBackground }}
    >
      <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <div className="flex flex-col gap-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/60 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--aurora-color-accent-strong)] backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-[color:var(--aurora-color-accent)]">
            Aurora Theme Framework
          </span>
          <h1 className="font-display text-4xl leading-[1.1] text-[color:var(--aurora-color-text)] md:text-5xl">
            {title}
          </h1>
          <p className="max-w-xl text-lg text-[color:var(--aurora-color-text-muted)] md:text-xl">{subtitle}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href={ctaPrimary.href}
              className="group inline-flex items-center justify-center gap-3 rounded-full bg-[color:var(--aurora-color-accent)] px-8 py-3 text-sm font-semibold text-[color:var(--aurora-color-accent-on)] shadow-aurora transition-transform duration-300 ease-aurora-spring hover:-translate-y-0.5 hover:shadow-auroraBold"
            >
              {ctaPrimary.label}
              <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
            </a>
            <a
              href={ctaSecondary.href}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[color:var(--aurora-color-border)] bg-white/60 px-8 py-3 text-sm font-semibold text-[color:var(--aurora-color-text)] backdrop-blur-md transition hover:bg-white/80 dark:bg-white/10 dark:hover:bg-white/20"
            >
              {ctaSecondary.label}
            </a>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {heroStats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/30 bg-white/55 p-4 text-left backdrop-blur-md dark:border-white/10 dark:bg-white/5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--aurora-color-text-subtle)]">
                  {stat.label}
                </p>
                <p className="mt-2 text-2xl font-semibold text-[color:var(--aurora-color-text)]">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative hidden rounded-[28px] border border-white/40 bg-white/70 p-2 shadow-aurora md:block dark:border-white/10 dark:bg-white/10">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[24px]">
            <img src={imageUrl} alt="Aurora residences" className="h-full w-full object-cover" loading="lazy" />
          </div>
          <div className="absolute -bottom-6 left-1/2 w-[85%] -translate-x-1/2 rounded-2xl border border-white/40 bg-white/90 p-4 shadow-aurora backdrop-blur dark:border-white/10 dark:bg-white/5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--aurora-color-text-muted)]">
              Featured listing
            </p>
            <p className="mt-2 text-base font-semibold text-[color:var(--aurora-color-text)]">Skyline Residences · Harare CBD</p>
            <p className="mt-1 text-sm text-[color:var(--aurora-color-text-subtle)]">3 Bed · Rooftop lounge · Smart home ready</p>
          </div>
        </div>
      </div>
    </section>
  );
}

const heroStats = [
  { label: 'Listings curated weekly', value: '180+' },
  { label: 'Verified agents on-board', value: '94' },
  { label: 'Avg. viewing rating', value: '4.9/5' }
];

type AuroraFeatureCardProps = {
  title: string;
  description: string;
  icon: ReactNode;
  className?: string;
};

export function AuroraFeatureCard({ title, description, icon, className }: AuroraFeatureCardProps) {
  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-[color:var(--aurora-color-border)] bg-[color:var(--aurora-color-elevated)] p-6 text-left shadow-aurora transition hover:-translate-y-1 hover:shadow-auroraBold',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ backgroundImage: auroraGradientBackground }} />
      <div className="relative flex flex-col gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--aurora-color-input)] text-[color:var(--aurora-color-accent)] shadow-aurora">
          {icon}
        </span>
        <h3 className="text-lg font-semibold text-[color:var(--aurora-color-text)]">{title}</h3>
        <p className="text-sm text-[color:var(--aurora-color-text-muted)]">{description}</p>
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--aurora-color-accent)]">
          Learn more →
        </span>
      </div>
    </article>
  );
}

type AuroraPropertyCardProps = {
  title: string;
  price: string;
  location: string;
  imageUrl: string;
  badges?: Array<{ label: string; tone?: 'accent' | 'success' | 'warning' }>;
};

export function AuroraPropertyCard({ title, price, location, imageUrl, badges = [] }: AuroraPropertyCardProps) {
  return (
    <article className="flex flex-col overflow-hidden rounded-[30px] border border-[color:var(--aurora-color-border)] bg-[color:var(--aurora-color-elevated)] shadow-aurora">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img src={imageUrl} alt={title} className="h-full w-full object-cover transition duration-700 hover:scale-105" loading="lazy" />
        <div className="absolute inset-x-4 top-4 flex gap-2">
          {badges.map((badge) => (
            <span
              key={badge.label}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold text-white backdrop-blur',
                badge.tone === 'success' && 'bg-emerald-500/80',
                badge.tone === 'warning' && 'bg-amber-500/80',
                (!badge.tone || badge.tone === 'accent') && 'bg-[color:var(--aurora-color-accent)]/80'
              )}
            >
              {badge.label}
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-6">
        <div>
          <h3 className="text-xl font-semibold text-[color:var(--aurora-color-text)]">{title}</h3>
          <p className="text-sm text-[color:var(--aurora-color-text-muted)]">{location}</p>
        </div>
        <div className="mt-auto flex items-center justify-between">
          <span className="text-lg font-semibold text-[color:var(--aurora-color-accent)]">{price}</span>
          <button className="inline-flex items-center gap-2 rounded-full bg-[color:var(--aurora-color-accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--aurora-color-accent-on)] shadow-aurora transition hover:-translate-y-0.5 hover:shadow-auroraBold">
            Book viewing
          </button>
        </div>
      </div>
    </article>
  );
}
