import Link from 'next/link';
import { Suspense } from 'react';
import { AuroraInlineForm, AuroraPipelineModal } from '@propad/ui';

const sections = [
  { href: '/dashboard/admin/geo', title: 'Geo admin', description: 'Review and merge pending geo submissions.' },
  { href: '/dashboard/admin/billing', title: 'Billing admin', description: 'Monitor invoices, intents, and transactions.' },
  { href: '/dashboard/admin/wallet', title: 'Wallet admin', description: 'Handle KYC, payout approvals, and AML policies.' },
  { href: '/dashboard/admin/rates', title: 'Rate admin', description: 'Set manual FX rates for billing operations.' }
];

export default function AdminHomePage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <Suspense fallback={<div>Loading admin console...</div>}>
        <AdminContent />
      </Suspense>
    </div>
  );
}

function AdminContent() {
  return (
    <>
      <header className="space-y-4">
        <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--aurora-color-border)] bg-[color:var(--aurora-color-elevated)]/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--aurora-color-text-subtle)]">
          Admin surfaces
        </span>
        <h1 className="text-3xl font-semibold text-[color:var(--aurora-color-text)]">Operate with Aurora precision</h1>
        <p className="max-w-3xl text-sm text-[color:var(--aurora-color-text-muted)]">
          Jump into the specialized admin consoles to unblock geo moderation, billing operations, wallet compliance, and rate management workstreams. Aurora keeps every module on brand with glassy surfaces, responsive density, and zero-compromise accessibility.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group relative overflow-hidden rounded-2xl border border-[color:var(--aurora-color-border)] bg-[color:var(--aurora-color-elevated)] p-5 text-[color:var(--aurora-color-text)] shadow-aurora transition hover:-translate-y-0.5 hover:shadow-auroraBold"
          >
            <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ backgroundImage: 'linear-gradient(135deg, rgba(98,120,255,0.25), transparent 70%)' }} />
            <div className="relative">
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <p className="mt-2 text-sm text-[color:var(--aurora-color-text-muted)]">{section.description}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--aurora-color-accent)]">
                Enter console →
              </span>
            </div>
          </Link>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <AuroraInlineForm heading="Treasury guardrails" />
        <AuroraPipelineModal
          title="Verification pipeline"
          items={[
            { title: 'Borrowdale clusters · 12 records', description: 'Awaiting geo merge from weekend sync.', status: 'pending' },
            { title: 'AML watchlist refresh', description: 'Wallet ops flagged two high-risk payouts.', status: 'inProgress' },
            { title: 'FX uplift audit', description: 'Rate desk approved manual uplift for USD/ZWL corridor.', status: 'complete' }
          ]}
        />
      </div>
    </>
  );
}
