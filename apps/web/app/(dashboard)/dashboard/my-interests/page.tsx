import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { formatCurrency } from '@/lib/formatters';
import { PropertyImage } from '@/components/property-image';
import { serverApiRequest } from '@/lib/server-api';

export const metadata: Metadata = {
  title: 'My Interests | PropAd'
};

export const dynamic = 'force-dynamic';

interface Interest {
  id: string;
  message: string | null;
  offerAmount: number | null;
  status: string;
  createdAt: string;
  property: {
    id: string;
    title: string;
    price: number;
    currency: string;
    type: string;
    listingIntent: string;
    city?: { name: string };
    suburb?: { name: string };
    media?: { url: string }[];
  };
}

async function getUserInterests(userId: string): Promise<Interest[]> {
  try {
    // TODO: Implement API endpoint
    // return await serverApiRequest<Interest[]>('/interests/my');
    console.warn('[my-interests/page.tsx] getUserInterests - API endpoint not yet implemented');
    return [];
  } catch (error) {
    console.error('Failed to fetch user interests:', error);
    return [];
  }
}

export default async function MyInterestsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const interests = await getUserInterests(session.user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Interests</h1>
        <p className="text-slate-500">Properties you've expressed interest in.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {interests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-slate-500 mb-4">You haven't expressed interest in any properties yet.</p>
            <Link
              href="/listings"
              className="text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Browse Properties →
            </Link>
          </div>
        ) : (
          <ul role="list" className="divide-y divide-slate-200">
            {interests.map((interest) => {
              const property = interest.property;
              const location = [property.suburb?.name, property.city?.name].filter(Boolean).join(', ') || 'Location not specified';
              const priceValue = typeof property.price === 'number' ? property.price : Number(property.price);
              const price = formatCurrency(priceValue, property.currency);
              const listingIntent = property.listingIntent === 'TO_RENT' ? 'For Rent' : 'For Sale';

              return (
                <li key={interest.id} className="p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        {property.media?.[0]?.url && (
                          <Link href={`/properties/${property.id}`} className="flex-shrink-0">
                            <PropertyImage
                              src={property.media[0].url.startsWith('http')
                                ? property.media[0].url
                                : `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'}${property.media[0].url}`}
                              alt={property.title}
                              className="h-24 w-32 rounded-lg object-cover"
                            />
                          </Link>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/properties/${property.id}`}
                              className="font-semibold text-slate-900 hover:underline hover:text-emerald-600"
                            >
                              {property.title}
                            </Link>
                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                              {listingIntent}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">{location}</p>
                          <p className="mt-1 text-lg font-semibold text-emerald-600">{price}</p>
                          {interest.message && (
                            <p className="mt-2 text-sm text-slate-600">Your message: "{interest.message}"</p>
                          )}
                          {interest.offerAmount !== null && interest.offerAmount !== undefined && (
                            <p className="mt-1 text-sm font-medium text-slate-700">
                              Your offer: {formatCurrency(Number(interest.offerAmount), property.currency)}
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                            <span>Status: <span className="font-medium capitalize text-slate-700">{interest.status.toLowerCase()}</span></span>
                            <span>•</span>
                            <span>Expressed on {new Date(interest.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Link
                        href={`/properties/${property.id}`}
                        className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
                      >
                        View Property
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
