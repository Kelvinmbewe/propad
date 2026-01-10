'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { cn } from '@propad/ui';
import type { Role } from '@propad/sdk';
import type { ReactNode } from 'react';
import { BarChart3, Compass, Globe2, LayoutDashboard, ShieldCheck, Wallet2, MapPin, Users, Building2, Receipt } from 'lucide-react';

const links = [
  { href: '/dashboard', label: 'Overview', roles: ['ADMIN', 'VERIFIER', 'AGENT', 'LANDLORD', 'USER', 'MODERATOR'] as Role[], icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: '/dashboard/listings', label: 'Listings', roles: ['ADMIN', 'AGENT', 'LANDLORD'] as Role[], icon: <Compass className="h-4 w-4" /> },
  { href: '/dashboard/verifications', label: 'Verifications', roles: ['ADMIN', 'VERIFIER', 'MODERATOR', 'AGENT', 'LANDLORD'] as Role[], icon: <ShieldCheck className="h-4 w-4" /> },
  { href: '/dashboard/site-visits', label: 'Site Visits', roles: ['ADMIN', 'MODERATOR'] as Role[], icon: <MapPin className="h-4 w-4" /> },
  { href: '/dashboard/admin/users', label: 'Users', roles: ['ADMIN'] as Role[], icon: <Users className="h-4 w-4" /> },
  { href: '/dashboard/admin/agencies', label: 'Companies', roles: ['ADMIN'] as Role[], icon: <Building2 className="h-4 w-4" /> },
  { href: '/dashboard/admin/trust', label: 'Trust & Risk', roles: ['ADMIN'] as Role[], icon: <ShieldCheck className="h-4 w-4" /> },
  { href: '/dashboard/interests', label: 'Offer & Interest', roles: ['ADMIN', 'AGENT', 'LANDLORD'] as Role[], icon: <Wallet2 className="h-4 w-4" /> },
  { href: '/dashboard/reward-pool', label: 'Reward pool', roles: ['ADMIN'] as Role[], icon: <BarChart3 className="h-4 w-4" /> },
  { href: '/dashboard/admin/rewards', label: 'Rewards Admin', roles: ['ADMIN'] as Role[], icon: <BarChart3 className="h-4 w-4" /> },
  { href: '/dashboard/admin/ads', label: 'Ads Admin', roles: ['ADMIN'] as Role[], icon: <Globe2 className="h-4 w-4" /> },
  { href: '/dashboard/admin/ledger', label: 'System Ledger', roles: ['ADMIN'] as Role[], icon: <Wallet2 className="h-4 w-4" /> },
  { href: '/dashboard/admin/geo', label: 'Geo admin', roles: ['ADMIN'] as Role[], icon: <Globe2 className="h-4 w-4" /> },
  { href: '/dashboard/admin/billing', label: 'Billing admin', roles: ['ADMIN'] as Role[], icon: <Wallet2 className="h-4 w-4" /> },
  { href: '/dashboard/admin/payment-providers', label: 'Payment Providers', roles: ['ADMIN'] as Role[], icon: <Wallet2 className="h-4 w-4" /> },
  { href: '/dashboard/admin/pricing', label: 'Pricing & Fees', roles: ['ADMIN'] as Role[], icon: <Wallet2 className="h-4 w-4" /> },
  { href: '/dashboard/admin/payouts', label: 'Payout Management', roles: ['ADMIN'] as Role[], icon: <Wallet2 className="h-4 w-4" /> },
  { href: '/dashboard/wallet', label: 'Wallet', roles: ['USER', 'AGENT', 'LANDLORD'] as Role[], icon: <Wallet2 className="h-4 w-4" /> },
  { href: '/dashboard/advertiser', label: 'Advertising', roles: ['ADMIN', 'ADVERTISER', 'LANDLORD'] as Role[], icon: <BarChart3 className="h-4 w-4" /> },
  { href: '/dashboard/advertiser/billing', label: 'Billing', roles: ['ADMIN', 'ADVERTISER', 'LANDLORD'] as Role[], icon: <Receipt className="h-4 w-4" /> },
  { href: '/dashboard/agent/rewards', label: 'My Rewards', roles: ['AGENT'] as Role[], icon: <Wallet2 className="h-4 w-4" /> },
  { href: '/dashboard/wallet/payouts', label: 'Payouts', roles: ['AGENT', 'LANDLORD', 'INDEPENDENT_AGENT'] as Role[], icon: <Wallet2 className="h-4 w-4" /> },
  { href: '/dashboard/admin/payouts', label: 'Payout Mgmt', roles: ['ADMIN'] as Role[], icon: <Wallet2 className="h-4 w-4" /> },
  { href: '/dashboard/admin/adsense', label: 'Google AdSense', roles: ['ADMIN'] as Role[], icon: <BarChart3 className="h-4 w-4" /> },
  { href: '/dashboard/user/rewards', label: 'My Rewards', roles: ['USER'] as Role[], icon: <Wallet2 className="h-4 w-4" /> },
  { href: '/dashboard/referrals', label: 'Referrals', roles: ['USER', 'AGENT'] as Role[], icon: <Users className="h-4 w-4" /> },
  { href: '/dashboard/earnings', label: 'Earnings', roles: ['AGENT'] as Role[], icon: <BarChart3 className="h-4 w-4" /> },
  { href: '/dashboard/profile', label: 'Profile', roles: ['AGENT', 'LANDLORD', 'USER', 'MODERATOR'] as Role[], icon: <Users className="h-4 w-4" /> },
];

import { NotificationsBell } from './notifications-bell';
import { useTrustScore } from '@/hooks/use-trust-score';
import { Badge } from '@propad/ui';

export function DashboardNav() {
  const pathname = usePathname();
  const { data } = useSession();
  const role = (data?.user?.role ?? 'USER') as Role;
  const { data: trustData } = useTrustScore();

  return (
    <nav className="flex h-full flex-col gap-6">
      <div className="rounded-2xl border border-[color:var(--aurora-color-border)] bg-[color:var(--aurora-color-highest)] p-4 text-[color:var(--aurora-color-text)] shadow-aurora">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--aurora-color-text-subtle)]">Workspace</p>
          <NotificationsBell />
        </div>
        <p className="mt-2 text-lg font-semibold">Aurora Command</p>
        <p className="text-sm text-[color:var(--aurora-color-text-muted)]">Operations and admin consoles</p>
      </div>

      <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
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

      {/* User Profile Section */}
      <div className="mt-auto rounded-xl border border-[color:var(--aurora-color-border)] bg-[color:var(--aurora-color-elevated)] p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
            {data?.user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{data?.user?.name || 'User'}</p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-neutral-500 truncate">{role}</p>
              {trustData?.score !== undefined && (
                <Badge variant={trustData.score >= 80 ? 'default' : trustData.score >= 50 ? 'secondary' : 'outline'} className="text-[10px] h-4 px-1">
                  Trust: {trustData.score}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
