import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { AdBanner } from '../components/AdBanner'
import { ListingCard } from '../components/ListingCard'
import { PolicyBadge } from '../components/PolicyBadge'
import { fetchListings } from '../services/api'

const promiseStatements = [
  {
    label: 'No viewing fees',
    description: 'Genuine landlords and agents never charge to view a property. We block those listings.'
  },
  {
    label: 'Agents paid by PropAd',
    description: 'Commissions come from our reward pool funded by ads and partners.'
  },
  {
    label: 'Verified listings',
    description: 'Every listing is reviewed against our policy engine and audited logs.'
  }
]

export const HomePage = () => {
  const { data: listings, isLoading } = useQuery({
    queryKey: ['listings'],
    queryFn: fetchListings
  })

  return (
    <main className="space-y-16 pb-20">
      <section className="bg-gradient-to-br from-brand-primary to-emerald-700 py-16 text-white">
        <div className="mx-auto flex w-11/12 max-w-6xl flex-col gap-10 md:flex-row md:items-center">
          <div className="space-y-6 md:w-2/3">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium uppercase tracking-wide">
              PropAd Zimbabwe · Free to browse
            </span>
            <h1 className="text-4xl font-bold md:text-5xl">Find your next home without hidden fees.</h1>
            <p className="text-lg text-white/80">
              Verified rentals and sales across Zimbabwe. Agents earn from PropAd, not from tenants or buyers.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://wa.me/?text=Check%20out%20PropAd%20Zimbabwe%20for%20verified%20properties%20without%20viewing%20fees%3A%20https%3A%2F%2Fpropad.co.zw"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-brand-primary shadow-lg"
              >
                Share on WhatsApp
              </a>
              <a
                href="https://www.facebook.com/sharer/sharer.php?u=https://propad.co.zw"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/60 px-6 py-3 font-semibold text-white"
              >
                Share on Facebook
              </a>
            </div>
          </div>
          <div className="md:w-1/3">
            <div className="rounded-3xl bg-white/10 p-6 text-sm leading-relaxed">
              <h3 className="mb-4 text-xl font-semibold">Why Zimbabwe trusts PropAd</h3>
              <ul className="space-y-3">
                <li>✅ Free to browse. Low-data friendly UI and offline support.</li>
                <li>✅ Listings moderated by our anti-fee policy engine.</li>
                <li>✅ Agents rewarded weekly from our transparent pool.</li>
              </ul>
              <AdBanner slot="home-hero" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-11/12 max-w-6xl">
        <h2 className="text-2xl font-semibold text-slate-900">Latest verified properties</h2>
        <p className="mt-2 text-sm text-slate-600">We only surface listings that pass our Zimbabwe-first policy engine.</p>
        {isLoading ? (
          <p className="mt-8 text-sm text-slate-500">Loading listings...</p>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {listings?.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            )) ?? <p>No listings yet.</p>}
          </div>
        )}
      </section>

      <section className="bg-white py-12">
        <div className="mx-auto w-11/12 max-w-5xl">
          <h2 className="text-2xl font-semibold text-slate-900">Our non-negotiables</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {promiseStatements.map((promise) => (
              <PolicyBadge key={promise.label} label={promise.label} description={promise.description} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-11/12 max-w-6xl">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-900">Agents, earn from our reward pool</h3>
            <p className="mt-3 text-sm text-slate-600">
              Register as a PropAd agent and receive payouts for verified leads. No more chasing 10% commissions.
            </p>
            <Link to="/agents" className="mt-6 inline-flex items-center text-brand-primary">
              View agent playbook →
            </Link>
          </div>
          <div className="rounded-2xl bg-brand-primary/10 p-6">
            <h3 className="text-xl font-semibold text-brand-primary">Community protection</h3>
            <p className="mt-3 text-sm text-brand-primary/90">
              Our policy engine blocks listings mentioning viewing fees, tenant registration fees, or 10% commissions.
              Every moderation action is logged and auditable.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
