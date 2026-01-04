import { prisma } from '@/lib/prisma';
import { LandingPropertyCard, type LandingProperty } from '@/components/landing-property-card';
import { LandingNav } from '@/components/landing-nav';

export const dynamic = 'force-dynamic';

async function getProperties(): Promise<LandingProperty[]> {
    const properties = await prisma.property.findMany({
        where: {
            status: 'VERIFIED'
        },
        orderBy: {
            createdAt: 'desc'
        },
        include: {
            suburb: true,
            city: true,
            media: true
        }
    });

    return properties.map((p: any) => ({
        id: p.id,
        title: p.title || `${p.bedrooms} Bed ${p.type} in ${p.suburb?.name || 'Harare'}`,
        location: `${p.suburb?.name || 'Harare'}, ${p.city?.name || 'Zimbabwe'}`,
        price: `$${Number(p.price).toLocaleString()}`,
        status: 'FOR SALE',
        statusTone: 'sale',
        imageUrl: p.media[0]?.url || 'https://images.unsplash.com/photo-1600596542815-2a4d9f0152e3?auto=format&fit=crop&w=800&q=80',
        beds: p.bedrooms || 0,
        baths: p.bathrooms || 0,
        area: 0
    } as LandingProperty));
}

export default async function PropertiesPage() {
    const properties = await getProperties();

    return (
        <div className="min-h-screen bg-slate-50">
            <LandingNav />
            <main className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
                <div className="mb-12">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                        All Properties
                    </h1>
                    <p className="mt-4 text-lg text-slate-500">
                        Browse our curated selection of premium properties.
                    </p>
                </div>

                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {properties.map((property) => (
                        <LandingPropertyCard key={property.id} property={property} />
                    ))}
                </div>

                {properties.length === 0 && (
                    <div className="text-center py-24">
                        <p className="text-lg text-slate-500">No properties found.</p>
                    </div>
                )}
            </main>
        </div>
    );
}
