import { ReactNode } from 'react';
import { DashboardNav } from '@/components/navigation';
import { RequireAuth } from '@/components/require-auth';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <div className="grid min-h-screen grid-cols-1 bg-neutral-100 md:grid-cols-[240px_1fr]">
        <aside className="border-r bg-white">
          <DashboardNav />
        </aside>
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </RequireAuth>
  );
}
