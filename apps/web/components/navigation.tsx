'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { cn } from '@propad/ui';
import type { Role } from '@propad/sdk';
import type { ReactNode } from 'react';
import { BarChart3, Compass, Globe2, LayoutDashboard, ShieldCheck, Wallet2, MapPin, Users, Building2 } from 'lucide-react';

const links: Array<{ href: string; label: string; roles: Role[]; icon: ReactNode }> = [
  { href: '/dashboard', label: 'Overview', roles: ['ADMIN', 'VERIFIER', 'AGENT', 'LANDLORD', 'USER', 'MODERATOR'], icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: '/dashboard/listings', label: 'Listings', roles: ['ADMIN', 'AGENT', 'LANDLORD'], icon: <Compass className="h-4 w-4" /> },
  { href: '/dashboard/verifications', label: 'Verifications', roles: ['ADMIN', 'VERIFIER', 'MODERATOR', 'AGENT', 'LANDLORD'], icon: <ShieldCheck className="h-4 w-4" /> },
  { href: '/dashboard/site-visits', label: 'Site Visits', roles: ['ADMIN', 'MODERATOR'], icon: <MapPin className="h-4 w-4" /> },
  { href: '/dashboard/admin/users', label: 'Users', roles: ['ADMIN'], icon: <Users className="h-4 w-4" /> },
  { href: '/dashboard/admin/agencies', label: 'Companies', roles: ['ADMIN'], icon: <Building2 className="h-4 w-4" /> },
  { href: '/dashboard/admin/trust', label: 'Trust & Risk', roles: ['ADMIN'], icon: <ShieldCheck className="h-4 w-4" /> },
  { href: '/dashboard/interests', label: 'Offer & Interest', roles: ['ADMIN', 'AGENT', 'LANDLORD'], icon: <Wallet2 className="h-4 w-4" /> },
  { href: '/dashboard/reward-pool', label: 'Reward pool', roles: ['ADMIN'], icon: <BarChart3 className="h-4 w-4" /> },
  { href: '/dashboard/admin/geo', label: 'Geo admin', roles: ['ADMIN'], icon: <Globe2 className="h-4 w-4" /> },
  { href: '/dashboard/admin/billing', label: 'Billing admin', roles: ['ADMIN'], icon: <Wallet2 className="h-4 w-4" /> },
  { href: '/dashboard/profile', label: 'Profile', roles: ['AGENT', 'LANDLORD', 'USER', 'MODERATOR'], icon: <Users className="h-4 w-4" /> },
];

export function DashboardNav() {
  const pathname = usePathname();
  const { data } = useSession();
  const role = (data?.user?.role ?? 'USER');

  return (
    <nav className="flex h-full flex-col gap-6">
      <div className="rounded-2xl border border-[color:var(--aurora-color-border)] bg-[color:var(--aurora-color-highest)] p-4 text-[color:var(--aurora-color-text)] shadow-aurora">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--aurora-color-text-subtle)]">Workspace</p>
        <p className="mt-2 text-lg font-semibold">Aurora Command</p>
        <p className="text-sm text-[color:var(--aurora-color-text-muted)]">Operations and admin consoles</p>
      </div>
      <div className="flex flex-1 flex-col gap-1">
        {links
          .filter((link) => link.roles.includes(role))
          .map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'group inline-flex items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium text-[color:var(--aurora-color-text-subtle)] transition hover:-translate-y-0.5 hover:bg-[color:var(--aurora-color-input)] hover:text-[color:var(--aurora-color-text)]',
                pathname.startsWith(link.href) &&
                'bg-[color:var(--aurora-color-accent)]/10 text-[color:var(--aurora-color-accent)] shadow-aurora'
              )}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[color:var(--aurora-color-input)] text-[color:var(--aurora-color-accent)] group-hover:bg-[color:var(--aurora-color-accent)]/15">
                {link.icon}
              </span>
              {link.label}
            </Link>
          ))}
      </div>
    </nav>
  );
}
