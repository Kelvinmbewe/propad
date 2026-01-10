'use client';

import { useState } from 'react';
import { keepPreviousData } from '@tanstack/react-query';
import { LandingPropertyCard } from '@/components/landing-property-card';
import { LandingNav } from '@/components/landing-nav';
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Card } from '@propad/ui';
import { usePropertySearch } from '@/hooks/use-property-search';
import { useDebounce } from '@/hooks/use-debounce'; // Assuming this hook exists or we create it
import { Filter, Search } from 'lucide-react';

export default function PropertiesPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [priceRange, setPriceRange] = useState<string>('all');
    const [propertyType, setPropertyType] = useState<string>('all');

    // Debounce search term
    const debouncedSearch = useDebounce(searchTerm, 500);

    const { data: properties, isLoading } = usePropertySearch({
        location: debouncedSearch,
        type: propertyType !== 'all' ? propertyType : undefined,
        verifiedOnly: true, // Default to strict safety
    });

    const results = Array.isArray(properties) ? properties : (properties as any)?.properties || [];

    return (
        <div className="min-h-screen bg-slate-50">
            <LandingNav />
            <main className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                        Find Verified Properties
                    </h1>
                    <p className="mt-2 text-lg text-slate-500">
                        Search through our verified listings with confidence.
                    </p>
                </div>

                {/* Search & Filters Bar */}
                <Card className="p-4 mb-8 bg-white/80 backdrop-blur-md sticky top-20 z-10 border-slate-200/60 shadow-sm">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search by city, suburb..."
                                className="pl-9 bg-slate-50 border-slate-200"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Select value={propertyType} onValueChange={setPropertyType}>
                            <SelectTrigger className="w-[180px] bg-slate-50">
                                <SelectValue placeholder="Property Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="APARTMENT">Apartment</SelectItem>
                                <SelectItem value="HOUSE">House</SelectItem>
                                <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value="price" disabled>
                            <SelectTrigger className="w-[180px] bg-slate-50">
                                <SelectValue placeholder="Price Range" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="price">Any Price</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </Card>

                {isLoading ? (
                    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-96 rounded-2xl bg-slate-200 animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                        {results.map((property: any) => (
                            <LandingPropertyCard key={property.id} property={property} />
                        ))}
                    </div>
                )}

                {!isLoading && results.length === 0 && (
                    <div className="text-center py-24">
                        <div className="bg-slate-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                            <Search className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">No properties found</h3>
                        <p className="text-slate-500">Try adjusting your filters or search area.</p>
                    </div>
                )}
            </main>
        </div>
    );
}
