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
            <main className="rounded-[32px] border border-[color:var(--aurora-color-border)] bg-[color:var(--aurora-color-elevated)]/90 p-4 shadow-aurora backdrop-blur md:p-8">
              {children}
            </main>
          </div>
        </div>
      </RequireAuth>
    </Suspense>
  );
}
