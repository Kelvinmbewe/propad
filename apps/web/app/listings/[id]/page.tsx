import { notFound } from 'next/navigation';
import Image from 'next/image';
import { env } from '@propad/config';
import { PropertySchema, type Property } from '@propad/sdk';
import { AdSlot } from '@/components/ad-slot';
import { ContactActions } from '@/components/contact-actions';
import { formatCurrency } from '@/lib/formatters';

async function fetchProperty(id: string): Promise<Property> {
  const response = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/properties/${id}`, {
    cache: 'no-store'
  });

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error('Failed to fetch property');
  }

  const json = await response.json();
  return PropertySchema.parse(json);
}

export default async function ListingDetailPage({ params }: { params: { id: string } }) {
  const property = await fetchProperty(params.id);
  const location = property.suburb ?? property.city;
  const price = formatCurrency(property.price, property.currency);
  const listingSlot = process.env.NEXT_PUBLIC_ADSENSE_LISTING_SLOT ?? process.env.NEXT_PUBLIC_ADSENSE_FEED_SLOT;

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="grid gap-10 lg:grid-cols-[2fr,1fr]">
        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {property.media?.length ? (
              property.media.map((media) => (
                <div key={media.id} className="relative h-64 w-full overflow-hidden rounded-lg bg-neutral-100">
                  <Image
                    src={media.url}
                    alt={`${property.type} in ${location}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
              ))
            ) : (
              <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-neutral-300 text-neutral-500">
                Images coming soon
              </div>
            )}
          </div>

          <article className="space-y-4">
            <h1 className="text-3xl font-semibold capitalize">{property.type.toLowerCase()} in {location}</h1>
            <p className="text-xl font-medium text-emerald-600">{price}</p>
            {property.description ? (
              <p className="whitespace-pre-line text-neutral-700">{property.description}</p>
            ) : (
              <p className="text-neutral-600">A verified listing on PropAd. Contact the landlord or agent for more details.</p>
            )}
            <ul className="flex flex-wrap gap-4 text-sm text-neutral-600">
              {property.bedrooms ? <li>{property.bedrooms} bedrooms</li> : null}
              {property.bathrooms ? <li>{property.bathrooms} bathrooms</li> : null}
              <li>{property.currency}</li>
            </ul>
          </article>

          <AdSlot slotId={listingSlot} propertyId={property.id} source="listing-main" />
        </section>

        <aside className="space-y-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Contact</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Start a WhatsApp chat or share this listing. Shortlinks are tracked so agents get rewarded when leads close.
            </p>
            <ContactActions property={property} />
          </div>

          <AdSlot slotId={listingSlot} propertyId={property.id} source="listing-sidebar" />
        </aside>
      </div>
    </main>
  );
}
