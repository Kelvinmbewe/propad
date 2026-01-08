import { LandingPropertyCard, type LandingProperty } from '@/components/landing-property-card';
import { LandingNav } from '@/components/landing-nav';
import { serverPublicApiRequest } from '@/lib/server-api';

export const dynamic = 'force-dynamic';

async function getProperties(): Promise<LandingProperty[]> {
    try {
        // TODO: Implement API endpoint for properties list
        // const properties = await serverPublicApiRequest<any[]>('/properties?status=VERIFIED');
        console.warn('[properties/page.tsx] getProperties - API endpoint not yet implemented');
        return [];
    } catch (error) {
        console.error('Failed to fetch properties:', error);
        return [];
    }
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
