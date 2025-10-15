'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { cn } from '@propad/ui';
import type { Role } from '@propad/sdk';

const links: Array<{ href: string; label: string; roles: Role[] }> = [
  { href: '/dashboard', label: 'Overview', roles: ['ADMIN', 'VERIFIER', 'AGENT', 'LANDLORD', 'USER'] },
  { href: '/dashboard/listings', label: 'Listings', roles: ['ADMIN', 'AGENT', 'LANDLORD'] },
  { href: '/dashboard/verifications', label: 'Verifications', roles: ['ADMIN', 'VERIFIER'] },
  { href: '/dashboard/reward-pool', label: 'Reward pool', roles: ['ADMIN'] }
];

export function DashboardNav() {
  const pathname = usePathname();
  const { data } = useSession();
  const role = (data?.user?.role ?? 'USER') as Role;

  return (
    <nav className="flex flex-col gap-1 p-4">
      {links
        .filter((link) => link.roles.includes(role))
        .map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'rounded-md px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900',
              pathname.startsWith(link.href) && 'bg-neutral-900 text-white hover:bg-neutral-900 hover:text-white'
            )}
          >
            {link.label}
          </Link>
        ))}
    </nav>
  );
}
