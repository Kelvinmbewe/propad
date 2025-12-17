import { prisma } from '@/lib/prisma';
import { LandingNav } from '@/components/landing-nav';
import { InterestButton } from '@/components/interest-button';
import { auth } from '@/auth';
import { PropertyMessenger } from '@/components/property-messenger';
import { notFound } from 'next/navigation';
import { Bath, BedDouble, MapPin, Ruler } from 'lucide-react';
import { getImageUrl } from '@/lib/image-url';

export const dynamic = 'force-dynamic';

async function getProperty(id: string, userId?: string) {
    const property = await prisma.property.findUnique({
        where: { id },
        include: {
            suburb: true,
            city: true,
            media: true,
            interests: userId ? {
                where: { userId }
            } : false
        }
    });

  if (!property) return null;

  const rawImageUrl = property.media[0]?.url;
  const imageUrl = getImageUrl(rawImageUrl);

  return {
    ...property,
    title: property.title || `${property.bedrooms} Bed ${property.type} in ${property.suburb?.name || 'Harare'}`,
    location: `${property.suburb?.name || 'Harare'}, ${property.city?.name || 'Zimbabwe'}`,
    imageUrl,
        price: Number(property.price),
        isInterested: property.interests && property.interests.length > 0,
        listingIntent: (property as any).listingIntent ?? 'FOR_SALE',
        areaSqm: (property as any).areaSqm ?? null
    };
}

export default async function PropertyDetailsPage({ params }: { params: { id: string } }) {
    const session = await auth();
    const property: any = await getProperty(params.id, session?.user?.id);

    if (!property) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <LandingNav />
            <main className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
                <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
                    <div className="relative h-96 w-full sm:h-[500px]">
                        <img
                            src={property.imageUrl}
                            alt={property.title}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                                console.error('Image load error:', property.imageUrl, e);
                                const target = e.target as HTMLImageElement;
                                target.src = 'https://images.unsplash.com/photo-1600596542815-2a4d9f0152e3?auto=format&fit=crop&w=800&q=80';
                            }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-0 left-0 p-8 text-white">
                            <div className="mb-2 flex items-center gap-2">
                                <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${property.listingIntent === 'TO_RENT' ? 'bg-blue-500' : 'bg-emerald-500'
                                    }`}>
                                    {property.listingIntent === 'TO_RENT' ? 'For Rent' : 'For Sale'}
                                </span>
                                <span className="flex items-center gap-1 text-sm font-medium">
                                    {/* MapPin removed for debugging */}
                                    {property.location}
                                </span>
                            </div>
                            <h1 className="text-3xl font-bold sm:text-4xl">{property.title}</h1>
                            <p className="mt-2 text-2xl font-semibold text-emerald-400">
                                ${property.price.toLocaleString()}{property.listingIntent === 'TO_RENT' ? '/month' : ''}
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-8 p-8 lg:grid-cols-3">
                        <div className="lg:col-span-2">
                            <h2 className="text-xl font-bold text-slate-900">Description</h2>
                            <p className="mt-4 text-slate-600 leading-relaxed">
                                {property.description || 'No description available for this property.'}
                            </p>

                            <div className="mt-8 grid grid-cols-3 gap-4 rounded-xl bg-slate-50 p-6">
                                <div className="flex flex-col items-center justify-center gap-2 text-slate-600">
                                    <BedDouble className="h-6 w-6 text-emerald-600" />
                                    <span className="font-semibold">{property.bedrooms} Bedrooms</span>
                                </div>
                                <div className="flex flex-col items-center justify-center gap-2 text-slate-600">
                                    <Bath className="h-6 w-6 text-emerald-600" />
                                    <span className="font-semibold">{property.bathrooms} Bathrooms</span>
                                </div>
                                <div className="flex flex-col items-center justify-center gap-2 text-slate-600">
                                    <Ruler className="h-6 w-6 text-emerald-600" />
                                    <span className="font-semibold">{property.areaSqm ? `${property.areaSqm} m²` : '-- m²'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <InterestButton propertyId={property.id} isInterested={property.isInterested} />

                            {session?.user ? (
                                <PropertyMessenger
                                    propertyId={property.id}
                                    landlordId={property.landlordId}
                                    agentOwnerId={property.agentOwnerId}
                                />
                            ) : (
                                <div className="rounded-lg border border-neutral-200 bg-white p-4 text-center">
                                    <p className="text-sm text-neutral-600">Sign in to chat with the owner</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
