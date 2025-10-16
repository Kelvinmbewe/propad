'use client';

import { AuroraLogo, Button, InlineAlert, AuroraSpinner } from '@aurora/ui';

const navItems = [
  'Overview',
  'Listings',
  'Leads',
  'Revenue',
  'Settings',
];

const alerts = [
  { variant: 'warning' as const, message: '2 maintenance tickets require scheduling.' },
  { variant: 'danger' as const, message: 'One payment failed to reconcile.' },
];

export default function AdminDemoPage() {
  return (
    <div className="grid min-h-screen grid-cols-[320px_1fr] bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <aside className="flex flex-col gap-8 border-r border-slate-200 bg-white/80 p-8 backdrop-blur dark:border-slate-800 dark:bg-slate-950/60">
        <AuroraLogo />
        <nav aria-label="Main navigation" className="grid gap-3">
          {navItems.map((item) => (
            <button
              key={item}
              className="rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-600 transition hover:bg-aurora-accent/10 hover:text-aurora-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aurora-accent dark:text-slate-300"
            >
              {item}
            </button>
          ))}
        </nav>
        <div className="mt-auto space-y-3 rounded-3xl bg-gradient-to-br from-aurora-primary/80 to-aurora-accent/90 p-6 text-white shadow-2xl">
          <p className="text-sm uppercase tracking-[0.3em]">Upgrade</p>
          <p className="text-lg font-semibold">Unlock advanced reporting</p>
          <Button>Upgrade plan</Button>
        </div>
      </aside>
      <main className="grid gap-8 p-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Good morning, Nomusa</p>
            <h1 className="text-3xl font-semibold">Portfolio dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost">Create alert</Button>
            <Button>New listing</Button>
          </div>
        </header>
        <section className="grid gap-6 lg:grid-cols-3">
          {[{ label: 'Revenue', value: '$482k', delta: '+5.4%' }, { label: 'Occupancy', value: '94%', delta: '+2.1%' }, { label: 'Lead conversions', value: '38%', delta: '+4.5%' }].map((item) => (
            <article key={item.label} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-aurora-accent/10 dark:border-slate-800 dark:bg-slate-950">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{item.label}</p>
              <p className="mt-3 text-3xl font-semibold">{item.value}</p>
              <p className="text-sm text-aurora-accent">{item.delta}</p>
            </article>
          ))}
        </section>
        <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-950">
            <header className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Pipeline velocity</h2>
              <Button variant="ghost">View report</Button>
            </header>
            <div className="mt-6 grid h-56 place-items-center rounded-2xl bg-gradient-to-br from-aurora-primary/15 to-aurora-accent/20">
              <AuroraSpinner />
              <p className="text-sm text-slate-500">Loading chart data…</p>
            </div>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-950">
            <h2 className="text-lg font-semibold">Alerts</h2>
            <div className="mt-4 grid gap-3">
              {alerts.map((alert) => (
                <InlineAlert key={alert.message} variant={alert.variant}>
                  {alert.message}
                </InlineAlert>
              ))}
            </div>
          </article>
        </section>
        <section className="rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
            <h2 className="text-lg font-semibold">Recent applications</h2>
            <Button variant="ghost">View all</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-800">
              <thead className="bg-slate-50/80 dark:bg-slate-900/60">
                <tr>
                  <th className="px-6 py-3">Resident</th>
                  <th className="px-6 py-3">Property</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {[
                  { name: 'Tadiwa Moyo', property: 'Aurora Heights', status: 'Interview', action: 'Schedule' },
                  { name: 'Rudo Ncube', property: 'Skyline Villas', status: 'Review', action: 'Review' },
                  { name: 'Kudzai Chirwa', property: 'Riverwalk Lofts', status: 'Approved', action: 'Onboard' },
                ].map((row) => (
                  <tr key={row.name} className="transition hover:bg-aurora-accent/5">
                    <td className="px-6 py-4 font-medium">{row.name}</td>
                    <td className="px-6 py-4">{row.property}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-aurora-primary/10 px-3 py-1 text-xs font-semibold text-aurora-primary">
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Button variant="ghost">{row.action}</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
