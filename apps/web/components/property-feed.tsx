import { Fragment } from 'react';
import type { Property } from '@propad/sdk';
import { AdSlot } from './ad-slot';
import { PropertyCard } from './property-card';

interface PropertyFeedProps {
  properties: Property[];
}

export function PropertyFeed({ properties }: PropertyFeedProps) {
  if (!properties.length) {
    return <p className="text-center text-neutral-500">No listings yet. Check back soon.</p>;
  }

  return (
    <div className="grid gap-6">
      <AdSlot source="feed-top" className="mx-auto max-w-4xl" />
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {properties.map((property, index) => (
          <Fragment key={property.id}>
            <PropertyCard property={property} />
            {(index + 1) % 3 === 0 ? (
              <div className="md:col-span-2 xl:col-span-3">
                <AdSlot source="feed-inline" className="mx-auto max-w-4xl" />
              </div>
            ) : null}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
