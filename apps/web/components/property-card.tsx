import { Badge, Card, CardContent, CardFooter, CardHeader, CardTitle } from '@propad/ui';
import Image from 'next/image';
import Link from 'next/link';
import type { Property } from '@propad/sdk';
import clsx from 'clsx';
import { formatCurrency } from '@/lib/formatters';

interface PropertyCardProps {
  property: Property;
  highlighted?: boolean;
}

export function PropertyCard({ property, highlighted = false }: PropertyCardProps) {
  const primaryImage = property.media?.[0]?.url;
  const location = property.location.suburb ?? property.location.city;
  const price = formatCurrency(property.price, property.currency);

  return (
    <Card
      className={clsx('overflow-hidden transition-shadow', {
        'ring-2 ring-blue-500 ring-offset-2 ring-offset-neutral-100 shadow-lg': highlighted
      })}
    >
      <Link href={`/listings/${property.id}`} className="group block h-full">
        {primaryImage ? (
          <div className="relative h-52 w-full overflow-hidden">
            <Image
              src={primaryImage}
              alt={`${property.type} in ${location}`}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            <Badge className="absolute left-3 top-3 bg-black/70 text-white">Verified</Badge>
          </div>
        ) : (
          <div className="flex h-52 w-full items-center justify-center bg-neutral-100 text-neutral-500">No image</div>
        )}
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="capitalize">{property.type.toLowerCase()}</span>
            <span className="text-base font-semibold">{price}</span>
          </CardTitle>
          <p className="text-sm text-neutral-500">{location}</p>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-neutral-600">
          {property.bedrooms ? <span>{property.bedrooms} bedrooms</span> : null}
          {property.bathrooms ? <span>{property.bathrooms} bathrooms</span> : null}
          {property.description ? <p className="line-clamp-2">{property.description}</p> : null}
        </CardContent>
        <CardFooter className="flex items-center justify-between text-xs text-neutral-500">
          <span>Tap to view details</span>
          <span className="font-medium">PropAd</span>
        </CardFooter>
      </Link>
    </Card>
  );
}
