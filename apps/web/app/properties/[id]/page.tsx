

import { LandingNav } from '@/components/landing-nav';
import { ApplicationModal } from '@/components/application-modal';
import { InterestButton } from '@/components/interest-button';
import { auth } from '@/auth';
import { PropertyMessenger } from '@/components/property-messenger';
import { PropertyImage } from '@/components/property-image';
import { notFound } from 'next/navigation';
import { Bath, BedDouble, MapPin, Ruler, Star, CheckCircle2 } from 'lucide-react';
import { Badge } from '@propad/ui';
import { ViewTracker } from '@/components/view-tracker';
import { serverPublicApiRequest } from '@/lib/server-api';

export const dynamic = 'force-dynamic';

interface PropertyDetails {
    id: string;
    title: string;
    description: string | null;
    price: string; // Decimal often comes as string in JSON
    currency: string;
    bedrooms: number;
    bathrooms: number;
    areaSqm: number | null;
    listingIntent: string;
    status: string;
    verificationLevel: string;
    isPromoted: boolean;
    landlordId: string;
    agentOwnerId: string | null;
    location: {
        country?: { name: string };
        city?: { name: string };
        suburb?: { name: string };
    };
    media: { url: string; type: string }[];
    amenities: string[];
}

async function getProperty(id: string): Promise<PropertyDetails | null> {
    try {
        // Fetch from API
        // NOTE: We rely on serverPublicApiRequest to handle the base URL.
        // It might be using internal Docker URL.
        const property = await serverPublicApiRequest<PropertyDetails>(`/properties/${id}`);
        return property;
    } catch (error) {
        console.error('Failed to fetch property:', error);
        return null;
    }
}

export default async function PropertyDetailsPage({ params }: { params: { id: string } }) {
    const session = await auth();
    const property = await getProperty(params.id);

    if (!property) {
        notFound();
    }

    // Authorization Check for Drafts (If API allows fetching but we want to double check UI side)
    // The API `findById` already strictly hides non-published for public.
    // If we are OWNER, the API `findById` would have returned it because we passed User (if we did).
    // Wait, `serverPublicApiRequest` usually doesn't pass Auth cookies unless configured.
    // D3 task said "Public: only PUBLISHED".
    // Owners might access via Dashboard, but if they click "View Listing" from Dashboard, they might land here.
    // If they land here and are logged in, we should ideally pass their token to `getProperty` to see DRAFTs.
    // But `getProperty` here uses `serverPublicApiRequest` which might not forward headers.
    // For now, let's assume this page is the PUBLIC view.
    // Owner preview might need a separate mechanism or token forwarding.

    const locationString = [
        property.location?.suburb?.name,
        property.location?.city?.name,
        property.location?.country?.name
    ].filter(Boolean).join(', ');

    // Safely handle price
    const priceNum = Number(property.price);
    const formattedPrice = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: property.currency || 'USD'
    }).format(priceNum);

    const mainImage = property.media?.[0]?.url || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80';

    return (
        <div className="min-h-screen bg-slate-50">
            <LandingNav />
            <ViewTracker propertyId={property.id} />
            <main className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
                <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
                    <div className="relative h-96 w-full sm:h-[500px]">
                        <PropertyImage
                            src={mainImage}
                            alt={property.title}
                            className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                        {/* Status Badges */}
                        <div className="absolute top-4 right-4 flex gap-2">
                            {property.isPromoted && <Badge className="bg-purple-600">Promoted</Badge>}
                            {(property.verificationLevel === 'VERIFIED' || property.verificationLevel === 'TRUSTED') && (
                                <Badge className="bg-blue-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Verified</Badge>
                            )}
                            {property.status !== 'PUBLISHED' && <Badge variant="secondary">{property.status}</Badge>}
                        </div>

                        <div className="absolute bottom-0 left-0 p-8 text-white">
                            <div className="mb-2 flex items-center gap-2">
                                <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${property.listingIntent === 'TO_RENT' ? 'bg-blue-500' : 'bg-emerald-500'
                                    }`}>
                                    {property.listingIntent === 'TO_RENT' ? 'For Rent' : 'For Sale'}
                                </span>
                                <span className="flex items-center gap-1 text-sm font-medium">
                                    <MapPin className="h-4 w-4" /> {locationString}
                                </span>
                            </div>
                            <h1 className="text-3xl font-bold sm:text-4xl">{property.title}</h1>
                            <p className="mt-2 text-2xl font-semibold text-emerald-400">
                                {formattedPrice}{property.listingIntent === 'TO_RENT' ? '/month' : ''}
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-8 p-8 lg:grid-cols-3">
                        <div className="lg:col-span-2">
                            <h2 className="text-xl font-bold text-slate-900">Description</h2>
                            <p className="mt-4 text-slate-600 leading-relaxed whitespace-pre-wrap">
                                {property.description || 'No description available for this property.'}
                            </p>

                            {property.amenities && property.amenities.length > 0 && (
                                <div className="mt-8">
                                    <h3 className="text-lg font-semibold mb-3">Amenities</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {property.amenities.map(a => (
                                            <Badge key={a} variant="outline" className="bg-slate-50">{a}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

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
                            {/* Role Based Actions */}
                            {session?.user?.id === property.landlordId || session?.user?.id === property.agentOwnerId ? (
                                <div className="rounded-lg border border-neutral-200 bg-emerald-50 p-4 text-center">
                                    <p className="text-sm font-medium text-emerald-800 mb-2">You own this listing</p>
                                    <Button className="w-full" asChild variant="outline">
                                        <a href={`/dashboard/listings/${property.id}`}>Manage Listing</a>
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <ApplicationModal
                                        propertyId={property.id}
                                        propertyTitle={property.title}
                                    />

                                    {session?.user ? (
                                        <div id="chat">
                                            <PropertyMessenger
                                                propertyId={property.id}
                                                landlordId={property.landlordId}
                                                agentOwnerId={property.agentOwnerId}
                                            />
                                        </div>
                                    ) : (
                                        <div className="rounded-lg border border-neutral-200 bg-white p-4 text-center">
                                            <p className="text-sm text-neutral-600 mb-2">Sign in to chat with the owner</p>
                                            <Button asChild variant="secondary" className="w-full">
                                                <a href={`/auth/signin?callbackUrl=/properties/${property.id}`}>Sign In</a>
                                            </Button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
