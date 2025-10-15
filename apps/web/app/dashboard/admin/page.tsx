import Link from 'next/link';

const sections = [
  { href: '/dashboard/admin/geo', title: 'Geo admin', description: 'Review and merge pending geo submissions.' },
  { href: '/dashboard/admin/billing', title: 'Billing admin', description: 'Monitor invoices, intents, and transactions.' },
  { href: '/dashboard/admin/wallet', title: 'Wallet admin', description: 'Handle KYC, payout approvals, and AML policies.' },
  { href: '/dashboard/admin/rates', title: 'Rate admin', description: 'Set manual FX rates for billing operations.' }
];

export default function AdminHomePage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-neutral-900">Admin operations</h1>
        <p className="text-sm text-neutral-500">
          Jump into the specialized admin consoles to unblock geo moderation, billing, wallet, and rate management work.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-neutral-300 hover:shadow"
          >
            <h2 className="text-lg font-medium text-neutral-900">{section.title}</h2>
            <p className="mt-1 text-sm text-neutral-500">{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
