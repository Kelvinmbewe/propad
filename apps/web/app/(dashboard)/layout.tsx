import { ReactNode, Suspense } from 'react';
import { DashboardNav } from '@/components/navigation';
import { RequireAuth } from '@/components/require-auth';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[color:var(--aurora-color-background)]" />}>
      <RequireAuth>
        <div className="relative min-h-screen bg-[color:var(--aurora-color-background)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_140%_at_10%_20%,rgba(98,120,255,0.35),transparent_60%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_90%_10%,rgba(34,211,238,0.25),transparent_60%)]" />
          <div className="relative mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-6 px-4 py-10 md:grid-cols-[280px_1fr] md:px-8">
            <aside className="rounded-[28px] border border-[color:var(--aurora-color-border)] bg-[color:var(--aurora-color-elevated)]/80 p-4 shadow-aurora backdrop-blur">
              <DashboardNav />
            </aside>
            <main className="rounded-[32px] border border-[color:var(--aurora-color-border)] bg-[color:var(--aurora-color-elevated)]/90    {
      name: 'Notifications',
      href: '/dashboard/notifications',
      icon: Bell,
      active: pathname === '/dashboard/notifications'
    },
    {
      name: 'Settings',
      href: '/dashboard/settings',
      icon: Settings,
      active: pathname === '/dashboard/settings'
    }
  ];

  // Add Agency Link if eligible
  const isAgencyUser = session?.user?.role === 'COMPANY_ADMIN' || session?.user?.role === 'AGENT';
  if (isAgencyUser) {
    const agencyIndex = items.findIndex(i => i.name === 'Wallet'); // Insert before Wallet or somewhere appropriate
    items.splice(agencyIndex, 0, {
      name: 'My Agency',
      href: '/dashboard/agency',
      icon: Building2,
      active: pathname.startsWith('/dashboard/agency')
    });
  }

  // Admin Links
  if (session?.user?.role === 'ADMIN') {;
} p-4 shadow-aurora backdrop-blur md:p-8">
              {children}
            </main>
          </div>
        </div>
      </RequireAuth>
    </Suspense>
  );
}
```
