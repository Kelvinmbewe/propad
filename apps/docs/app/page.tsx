'use client';

import Link from 'next/link';
import { AuroraLogo } from '@aurora/ui';

const navItems = [
  { href: '/foundations/colors', label: 'Colors' },
  { href: '/components/buttons', label: 'Components' },
  { href: '/layouts/landing-hero', label: 'Layouts' },
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-8 py-24" aria-labelledby="aurora-docs-home">
      <header className="flex flex-col items-start gap-8">
        <AuroraLogo className="w-40" />
        <div>
          <p className="uppercase tracking-[0.3em] text-aurora-accent/80">Beauty Unimagined</p>
          <h1 id="aurora-docs-home" className="mt-4 text-5xl font-semibold text-slate-900 dark:text-white">
            Aurora Theme Framework
          </h1>
          <p className="mt-4 max-w-xl text-lg text-slate-600 dark:text-slate-300">
            A complete brand, motion, and documentation ecosystem for proptech teams. Explore design tokens, UI
            components, and production ready layouts crafted with accessibility and polish.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/foundations/colors"
            className="rounded-full bg-gradient-to-br from-aurora-primary to-aurora-accent px-6 py-3 font-semibold text-white shadow-lg shadow-aurora-accent/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aurora-accent"
          >
            Start exploring
          </Link>
          <Link
            href="/components/buttons"
            className="rounded-full border border-aurora-accent/40 px-6 py-3 font-semibold text-aurora-accent shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aurora-accent"
          >
            View components
          </Link>
        </div>
        <nav aria-label="Quick start" className="flex flex-wrap gap-6">
          {navItems.map((item) => (
            <Link key={item.href} className="text-sm font-semibold text-aurora-accent" href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
    </main>
  );
}
