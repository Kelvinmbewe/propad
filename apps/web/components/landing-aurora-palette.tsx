'use client';

import { motion } from 'framer-motion';
import { cn } from '@propad/ui';

const paletteCards = [
  {
    token: 'Primary current',
    caption: 'Buttons, hero gradients, progress accents',
    gradient: 'from-primary-400 via-primary-500 to-primary-600',
    swatches: ['bg-primary-200', 'bg-primary-400', 'bg-primary-600'],
    description:
      'Teal currents communicate forward momentum. Reserve for the most important calls to action and confirmations.'
  },
  {
    token: 'Secondary horizon',
    caption: 'Navigation, map pins, information states',
    gradient: 'from-secondary-300 via-secondary-400 to-secondary-600',
    swatches: ['bg-secondary-200', 'bg-secondary-400', 'bg-secondary-700'],
    description:
      'Cool ocean blues reinforce trust and legibility when supporting the primary action or outlining navigation paths.'
  },
  {
    token: 'Accent sunrise',
    caption: 'Highlights, marketing ribbons, emphasis chips',
    gradient: 'from-accent-200 via-accent-400 to-accent-600',
    swatches: ['bg-accent-200', 'bg-accent-400', 'bg-accent-700'],
    description:
      'Sunrise accents celebrate delightful interactions. Use to draw attention to premium inventory or new product surfaces.'
  },
  {
    token: 'Support signals',
    caption: 'Status badges, charts, KPI deltas',
    gradient: 'from-success-400 via-warning-400 to-info-500',
    swatches: ['bg-success-400', 'bg-warning-400', 'bg-info-500'],
    description:
      'Success, warning, and info scales retain WCAG contrast across themes while pairing harmoniously with the Aurora core.'
  },
  {
    token: 'Neutral stage',
    caption: 'Backgrounds, surfaces, typography',
    gradient: 'from-neutral-100 via-neutral-200 to-neutral-300',
    swatches: ['bg-neutral-100', 'bg-neutral-200', 'bg-neutral-400'],
    description:
      'Soft neutrals let vivid chroma breathe. Layer them for cards, glassmorphism panels, and typography foundations.'
  }
] as const;

const containerVariants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { staggerChildren: 0.12, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 32, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.34, 1.56, 0.64, 1] } }
};

export function LandingAuroraPalette() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 sm:px-12 lg:px-16">
      <div className="rounded-[36px] border border-aurora-border bg-white/80 p-8 shadow-aurora backdrop-blur dark:bg-slate-950/60">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.35 }}
          variants={containerVariants}
          className="flex flex-col gap-10"
        >
          <header className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-end">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.35em] text-aurora-text-subtle">Aurora palette</p>
              <h2 className="text-3xl font-semibold text-aurora-text sm:text-4xl">
                Aurora tokens keep marketing and admin surfaces perfectly in sync.
              </h2>
            </div>
            <p className="text-sm text-aurora-text-muted md:text-base">
              Each tile references the Tailwind token name so designers and engineers speak the same language. Hover to watch
              the aurora sheen animate across the surface.
            </p>
          </header>
          <motion.ul
            variants={containerVariants}
            className="grid gap-6 md:grid-cols-2 xl:grid-cols-3"
          >
            {paletteCards.map((card) => (
              <motion.li key={card.token} variants={cardVariants} whileHover={{ y: -6 }} className="h-full">
                <article className="group relative flex h-full flex-col overflow-hidden rounded-[28px] border border-aurora-border bg-white/80 p-6 shadow-[0_30px_80px_-60px_rgba(15,23,42,0.55)] transition duration-500 ease-aurora-smooth dark:bg-slate-950/70">
                  <div
                    aria-hidden
                    className={cn(
                      'pointer-events-none absolute inset-0 opacity-80 blur-3xl transition duration-700 ease-aurora-smooth group-hover:opacity-100',
                      `bg-gradient-to-br ${card.gradient}`
                    )}
                  />
                  <div className="relative flex flex-col gap-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-aurora-text-subtle">{card.token}</p>
                        <p className="text-sm text-aurora-text-muted">{card.caption}</p>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-[color:var(--aurora-color-input)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-aurora-text-subtle">
                        Token
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {card.swatches.map((swatch) => (
                        <span
                          key={swatch}
                          aria-label={swatch.replace('bg-', '').replaceAll('-', ' ')}
                          title={swatch.replace('bg-', '')}
                          className={cn('flex h-10 w-10 items-center justify-center rounded-2xl shadow-lg ring-1 ring-black/5 dark:ring-white/10', swatch)}
                        >
                          <span className="sr-only">{swatch.replace('bg-', '').replaceAll('-', ' ')}</span>
                        </span>
                      ))}
                    </div>
                    <p className="text-sm leading-relaxed text-aurora-text-muted">{card.description}</p>
                  </div>
                </article>
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>
      </div>
    </section>
  );
}
