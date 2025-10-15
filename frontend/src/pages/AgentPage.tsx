import { Link } from 'react-router-dom'

export const AgentPage = () => (
  <section className="mx-auto w-11/12 max-w-4xl space-y-8 py-12">
    <header>
      <h1 className="text-3xl font-bold text-slate-900">PropAd Agent Playbook</h1>
      <p className="mt-3 text-slate-600">
        Close verified leads, earn payouts from our weekly reward pool, and grow your personal brand without charging tenants.
      </p>
    </header>

    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-2xl border border-brand-primary/30 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-brand-primary">Weekly payouts</h2>
        <p className="mt-3 text-sm text-slate-600">
          Submit verified listings and close leads shared via PropAd. Rewards are distributed every Friday from the ads-funded pool.
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Stay policy compliant</h2>
        <p className="mt-3 text-sm text-slate-600">
          Listings containing viewing fees, tenant registration fees, or 10% commissions are auto-blocked. Keep descriptions clean.
        </p>
      </div>
    </div>

    <div className="rounded-2xl bg-brand-primary/10 p-6">
      <h3 className="text-xl font-semibold text-brand-primary">Get verified</h3>
      <p className="mt-2 text-sm text-brand-primary/80">
        Submit your REIZ or Estate Agents Council credentials via our onboarding form. Our team verifies within 48 hours.
      </p>
      <a
        href="https://forms.gle/propad-agents"
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex items-center rounded-full bg-brand-primary px-6 py-3 text-sm font-semibold text-white shadow"
      >
        Apply to become an agent
      </a>
    </div>
  </section>
)
