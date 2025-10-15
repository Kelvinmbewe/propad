export const AdminPage = () => (
  <section className="mx-auto w-11/12 max-w-4xl space-y-8 py-12">
    <header>
      <h1 className="text-3xl font-bold text-slate-900">Operations Command Centre</h1>
      <p className="mt-3 text-slate-600">
        Admins get full visibility into policy violations, reward pool balances, and audit logs synced from the API.
      </p>
    </header>

    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">What you can monitor</h2>
      <ul className="mt-4 space-y-3 text-sm text-slate-600">
        <li>• Approve or reject flagged listings with contextual policy hits.</li>
        <li>• Download auditable logs for regulator reviews.</li>
        <li>• Allocate reward payouts to top-performing agents.</li>
        <li>• Manage partner integrations and announcement banners.</li>
      </ul>
    </div>

    <div className="rounded-2xl border border-dashed border-brand-primary/40 p-6">
      <h3 className="text-xl font-semibold text-brand-primary">Ready for deployment</h3>
      <p className="mt-2 text-sm text-brand-primary/80">
        Hook the frontend up to the FastAPI admin endpoints with your admin token to run PropAd in production.
      </p>
    </div>
  </section>
)
