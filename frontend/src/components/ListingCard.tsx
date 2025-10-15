import type { Listing } from '../services/api'

interface Props {
  listing: Listing
}

export const ListingCard = ({ listing }: Props) => {
  const cover = listing.media_items[0]?.url ?? 'https://images.unsplash.com/photo-1600585154340-0ef3c08dcdb6?auto=format&fit=crop&w=800&q=60'
  return (
    <article className="rounded-xl bg-white shadow-sm transition hover:shadow-lg">
      <img src={cover} alt={listing.title} className="h-48 w-full rounded-t-xl object-cover" loading="lazy" />
      <div className="space-y-3 p-5">
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span className="font-semibold text-brand-primary">{listing.currency} {listing.price.toLocaleString()}</span>
          <span className="rounded-full bg-brand-primary/10 px-3 py-1 text-xs uppercase tracking-wide text-brand-primary">
            {listing.listing_purpose}
          </span>
        </div>
        <h3 className="text-lg font-semibold text-slate-900">{listing.title}</h3>
        <p className="h-12 overflow-hidden text-sm text-slate-600">{listing.description}</p>
        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
          <span>📍 {listing.location_area}, {listing.location_city}</span>
          {listing.bedrooms ? <span>🛏️ {listing.bedrooms} bedrooms</span> : null}
          {listing.bathrooms ? <span>🛁 {listing.bathrooms} baths</span> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {listing.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
              #{tag}
            </span>
          ))}
        </div>
      </div>
    </article>
  )
}
