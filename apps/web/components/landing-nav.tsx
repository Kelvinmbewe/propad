'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AuroraThemeToggle, Button, cn } from '@propad/ui';

const navLinks = [
  { href: '#listings', label: 'Listings' },
  { href: '#map', label: 'Map' },
  { href: '#contact', label: 'Contact' }
];

export function LandingNav() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-500',
        isScrolled
          ? 'bg-white/90 text-slate-900 shadow-[0_16px_60px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl'
          : 'bg-transparent text-white'
      )}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 lg:px-8">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          PropAd<span className="text-emerald-300">.</span>
        </Link>
        <div className="hidden items-center gap-10 text-sm font-medium md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="relative pb-1 transition-colors duration-[var(--motion-duration)] ease-[var(--motion-ease)] hover:text-emerald-400 focus-visible:text-emerald-400 after:absolute after:left-1/2 after:bottom-0 after:h-[2px] after:w-full after:-translate-x-1/2 after:origin-center after:scale-x-0 after:bg-current after:transition-transform after:duration-[var(--motion-duration)] after:ease-[var(--motion-ease)] hover:after:scale-x-100 focus-visible:after:scale-x-100"
            >
              {link.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <AuroraThemeToggle
            className={cn(
              'rounded-full border px-3 py-2 text-sm transition',
              isScrolled
                ? 'border-slate-200 bg-white text-slate-900 hover:border-emerald-200 hover:text-emerald-500'
                : 'border-white/20 bg-white/10 text-white hover:border-emerald-200 hover:text-emerald-200'
            )}
          />
          <Button
            variant="outline"
            className={cn(
              'hidden rounded-full shadow-[0_0_0_rgba(0,0,0,0)] transition md:inline-flex',
              isScrolled
                ? 'border-slate-200 bg-white text-slate-900 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600'
                : 'border-white/30 bg-white/10 text-white hover:border-emerald-300 hover:bg-emerald-400/20 hover:shadow-[0_10px_30px_-10px_rgba(16,185,129,0.65)]'
            )}
          >
            Sign in
          </Button>
          <Button className="rounded-full bg-emerald-500 px-6 text-white shadow-[0_15px_45px_-20px_rgba(16,185,129,0.85)] transition hover:bg-emerald-400 hover:shadow-[0_18px_48px_-18px_rgba(45,212,191,0.85)]">
            List a property
          </Button>
        </div>
      </nav>
    </header>
  );
}
