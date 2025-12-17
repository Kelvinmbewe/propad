import { notFound } from 'next/navigation';
import Image from 'next/image';
import { env, getServerApiBaseUrl } from '@propad/config';
import { PropertySchema, type Property } from '@propad/sdk';
import { AdSlot } from '@/components/ad-slot';
import { ContactActions } from '@/components/contact-actions';
import { PropertyImage } from '@/components/property-image';
import { formatCurrency, formatFriendlyDate } from '@/lib/formatters';
import { getImageUrl } from '@/lib/image-url';

async function fetchProperty(id: string): Promise<Property> {
  const response = await fetch(`${getServerApiBaseUrl()}/properties/${id}`, {
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

const COMMERCIAL_TYPES = new Set([
  'COMMERCIAL_OFFICE',
  'COMMERCIAL_RETAIL',
  'COMMERCIAL_INDUSTRIAL',
  'WAREHOUSE',
  'FARM',
  'MIXED_USE',
  'OTHER'
]);

const RESIDENTIAL_TYPES = new Set(['ROOM', 'COTTAGE', 'HOUSE', 'APARTMENT', 'TOWNHOUSE']);

function humanizeType(type: string) {
  return type.replace(/_/g, ' ').toLowerCase();
}

function resolveListingUrl(id: string) {
  const fallback = env.WEB_ORIGIN ?? env.NEXT_PUBLIC_API_BASE_URL;
  if (!fallback) {
    return `/listings/${id}`;
  }

  try {
    const base = new URL(fallback);
    const origin = env.WEB_ORIGIN ?? `${base.protocol}//${base.host}`;
    return `${origin.replace(/\/$/, '')}/listings/${id}`;
  } catch {
    return `${fallback.replace(/\/$/, '')}/listings/${id}`;
  }
}

function resolveLocationName(property: Property) {
  return (
    property.suburbName ??
    property.cityName ??
    property.provinceName ??
    property.countryName ??
    property.location.suburb?.name ??
    property.location.city?.name ??
    property.location.province?.name ??
    property.location.country?.name ??
    'Zimbabwe'
  );
}

function buildStructuredData(property: Property, listingUrl: string) {
  const location = resolveLocationName(property);
  const addressLocality =
    property.suburbName ?? property.location.suburb?.name ?? property.cityName ?? property.location.city?.name ?? null;
  const addressRegion =
    property.cityName ?? property.location.city?.name ?? property.provinceName ?? property.location.province?.name ?? null;
  const isCommercial = COMMERCIAL_TYPES.has(property.type);
  const isResidential = RESIDENTIAL_TYPES.has(property.type);
  const itemOffered: Record<string, unknown> = {
    '@type': isCommercial ? 'CommercialBuilding' : isResidential ? 'Residence' : 'Place',
    name: `${humanizeType(property.type)} in ${location}`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: addressLocality ?? location,
      addressRegion: addressRegion ?? location,
      addressCountry: 'ZW'
    }
  };

  if (property.bedrooms) {
    itemOffered.numberOfRooms = property.bedrooms;
  }
  if (property.bathrooms) {
    itemOffered.numberOfBathroomsTotal = property.bathrooms;
  }
  if (property.commercialFields?.floorAreaSqm) {
    itemOffered.floorSize = {
      '@type': 'QuantitativeValue',
      value: property.commercialFields.floorAreaSqm,
      unitCode: 'MTK'
    };
  }
  if (property.commercialFields?.lotSizeSqm) {
    itemOffered.lotSize = {
      '@type': 'QuantitativeValue',
      value: property.commercialFields.lotSizeSqm,
      unitCode: 'MTK'
    };
  }
  if (property.amenities?.length) {
    itemOffered.amenityFeature = property.amenities.map((amenity) => ({
      '@type': 'LocationFeatureSpecification',
      name: amenity
    }));
  }

  const additionalProperty: Array<Record<string, string>> = [];
  if (property.commercialFields?.loadingBay) {
    additionalProperty.push({ '@type': 'PropertyValue', name: 'Loading bay', value: 'Available' });
  }
  if (property.commercialFields?.powerPhase) {
    additionalProperty.push({
      '@type': 'PropertyValue',
      name: 'Power phase',
      value: property.commercialFields.powerPhase
    });
  }
  if (property.commercialFields?.parkingBays) {
    additionalProperty.push({
      '@type': 'PropertyValue',
      name: 'Parking bays',
      value: property.commercialFields.parkingBays.toString()
    });
  }
  if (property.commercialFields?.zoning) {
    additionalProperty.push({
      '@type': 'PropertyValue',
      name: 'Zoning',
      value: property.commercialFields.zoning
    });
  }
  if (additionalProperty.length) {
    itemOffered.additionalProperty = additionalProperty;
  }

  const images = property.media?.map((media) => media.url).filter(Boolean);

  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: `${humanizeType(property.type)} in ${location}`,
    description:
      property.description ?? `Verified ${humanizeType(property.type)} listing in ${location}.`,
    url: listingUrl,
    image: images && images.length ? images : undefined,
    datePosted: property.createdAt ?? new Date().toISOString(),
    areaServed: addressRegion ?? location,
    offers: {
      '@type': 'Offer',
      price: property.price,
      priceCurrency: property.currency,
      availability:
        property.availability === 'DATE'
          ? 'https://schema.org/PreOrder'
          : 'https://schema.org/InStock',
      ...(property.availability === 'DATE' && property.availableFrom
        ? { availabilityStarts: property.availableFrom }
        : {})
    },
    itemOffered,
    seller: {
      '@type': 'Organization',
      name: 'PropAd'
    }
  };
}

export default async function ListingDetailPage({ params }: { params: { id: string } }) {
  const property = await fetchProperty(params.id);
  const location = resolveLocationName(property);
  const price = formatCurrency(property.price, property.currency);
  const listingSlot = process.env.NEXT_PUBLIC_ADSENSE_LISTING_SLOT ?? process.env.NEXT_PUBLIC_ADSENSE_FEED_SLOT;
  const availabilityLabel =
    property.availability === 'DATE' && property.availableFrom
      ? `Available ${formatFriendlyDate(property.availableFrom)}`
      : 'Available now';
  const furnishingLabel =
    property.furnishing && property.furnishing !== 'NONE'
      ? `${property.furnishing === 'FULLY' ? 'Fully' : property.furnishing === 'PARTLY' ? 'Partly' : 'Lightly'} furnished`
      : null;
  const numberFormatter = new Intl.NumberFormat('en-ZW');
  const floorAreaLabel = property.commercialFields?.floorAreaSqm
    ? `${numberFormatter.format(property.commercialFields.floorAreaSqm)} sqm`
    : null;
  const lotSizeLabel = property.commercialFields?.lotSizeSqm
    ? `${numberFormatter.format(property.commercialFields.lotSizeSqm)} sqm lot`
    : null;
  const parkingLabel = property.commercialFields?.parkingBays
    ? `${numberFormatter.format(property.commercialFields.parkingBays)} parking bays`
    : null;
  const powerPhaseLabel = property.commercialFields?.powerPhase
    ? `${property.commercialFields.powerPhase.toLowerCase()} phase`
    : null;
  const loadingBayLabel = property.commercialFields?.loadingBay ? 'Loading bay available' : null;
  const zoningLabel = property.commercialFields?.zoning ? `Zoning: ${property.commercialFields.zoning}` : null;
  const complianceDocsUrl = property.commercialFields?.complianceDocsUrl ?? null;
  const amenities = property.amenities ?? [];
  const listingUrl = resolveListingUrl(property.id);
  const structuredData = buildStructuredData(property, listingUrl);
  const typeLabel = humanizeType(property.type);

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="grid gap-10 lg:grid-cols-[2fr,1fr]">
        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {property.media?.length ? (
              property.media.map((media) => {
                const src = getImageUrl(media.url);

                return (
                  <div
                    key={media.id}
                    className="relative h-64 w-full overflow-hidden rounded-lg bg-neutral-100"
                  >
                    <PropertyImage
                      src={src}
                      alt={`${property.type} in ${location}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                );
              })
            ) : (
              <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-neutral-300 text-neutral-500">
                Images coming soon
              </div>
            )}
          </div>

          <article className="space-y-4">
            <h1 className="text-3xl font-semibold capitalize">{typeLabel} in {location}</h1>
            <p className="text-xl font-medium text-emerald-600">{price}</p>
            <p className="text-sm uppercase tracking-wide text-emerald-700">{availabilityLabel}</p>
            {property.description ? (
              <p className="whitespace-pre-line text-neutral-700">{property.description}</p>
            ) : (
              <p className="text-neutral-600">A verified listing on PropAd. Contact the landlord or agent for more details.</p>
            )}
            <ul className="flex flex-wrap gap-4 text-sm text-neutral-600">
              {property.bedrooms ? <li>{property.bedrooms} bedrooms</li> : null}
              {property.bathrooms ? <li>{property.bathrooms} bathrooms</li> : null}
              {furnishingLabel ? <li>{furnishingLabel}</li> : null}
              {floorAreaLabel ? <li>{floorAreaLabel}</li> : null}
              {lotSizeLabel ? <li>{lotSizeLabel}</li> : null}
              {parkingLabel ? <li>{parkingLabel}</li> : null}
              {powerPhaseLabel ? <li>{powerPhaseLabel}</li> : null}
              {loadingBayLabel ? <li>{loadingBayLabel}</li> : null}
              {zoningLabel ? <li>{zoningLabel}</li> : null}
              <li>{property.currency}</li>
            </ul>
            {complianceDocsUrl ? (
              <a
                href={complianceDocsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm font-medium text-emerald-700 hover:text-emerald-800"
              >
                View compliance documents
              </a>
            ) : null}
            {amenities.length ? (
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-neutral-800">Amenities</h2>
                <ul className="flex flex-wrap gap-2 text-sm text-neutral-600">
                  {amenities.map((amenity) => (
                    <li
                      key={amenity}
                      className="rounded-full bg-neutral-100 px-3 py-1 text-neutral-700"
                    >
                      {amenity}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
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
