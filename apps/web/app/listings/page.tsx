import { Metadata } from 'next';
import { env } from '@propad/config';
import { PropertySchema, type Property } from '@propad/sdk';
import { PropertyFeed } from '@/components/property-feed';

export const metadata: Metadata = {
  title: 'Browse Listings | PropAd',
  description: 'Discover verified rentals and sale properties across Zimbabwe on PropAd.'
};

async function fetchProperties(): Promise<Property[]> {
  const response = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/properties/search?limit=18`, {
    next: { revalidate: 60 }
  });

  if (!response.ok) {
    return [];
  }

  const json = await response.json();
  return PropertySchema.array().parse(json);
}

export default async function ListingsPage() {
  const properties = await fetchProperties();

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12">
      <section className="text-center">
        <h1 className="text-3xl font-semibold md:text-4xl">Featured Zimbabwe property listings</h1>
        <p className="mt-3 text-neutral-600">
          Verified rooms, cottages, and homes sourced from trusted landlords and agents. Ads support the zero-fee marketplace.
        </p>
      </section>

      <PropertyFeed properties={properties} />
    </main>
  );
}
