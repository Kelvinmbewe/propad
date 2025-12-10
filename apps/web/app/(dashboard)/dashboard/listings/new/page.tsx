'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Label, notify } from '@propad/ui';
import { Loader2, Search, X } from 'lucide-react';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';
import type { GeoSearchResult } from '@propad/sdk';

const PROPERTY_TYPES = [
    { value: 'ROOM', label: 'Room' },
    { value: 'COTTAGE', label: 'Cottage' },
    { value: 'HOUSE', label: 'House' },
    { value: 'APARTMENT', label: 'Apartment' },
    { value: 'TOWNHOUSE', label: 'Townhouse' },
    { value: 'PLOT', label: 'Plot' },
    { value: 'LAND', label: 'Land' },
    { value: 'COMMERCIAL_OFFICE', label: 'Commercial Office' },
    { value: 'COMMERCIAL_RETAIL', label: 'Commercial Retail' },
    { value: 'COMMERCIAL_INDUSTRIAL', label: 'Industrial' },
    { value: 'WAREHOUSE', label: 'Warehouse' },
    { value: 'FARM', label: 'Farm' },
] as const;

interface LocationSelection {
    countryId?: string;
    provinceId?: string;
    cityId?: string;
    suburbId?: string;
    displayName: string;
}

export default function CreatePropertyPage() {
    const router = useRouter();
    const sdk = useAuthenticatedSDK();
    const [isLoading, setIsLoading] = useState(false);

    // Geo search state
    const [geoQuery, setGeoQuery] = useState('');
    const [geoResults, setGeoResults] = useState<GeoSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<LocationSelection | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);

    // Debounced geo search
    useEffect(() => {
        if (!sdk || geoQuery.length < 2) {
            setGeoResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const results = await sdk.geo.search(geoQuery);
                setGeoResults(results);
                setShowDropdown(true);
            } catch (error) {
                console.error('Geo search failed:', error);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [geoQuery, sdk]);

    const handleLocationSelect = (result: GeoSearchResult) => {
        const location: LocationSelection = {
            displayName: result.name
        };

        if (result.level === 'COUNTRY') {
            location.countryId = result.id;
        } else if (result.level === 'PROVINCE') {
            location.countryId = result.countryId ?? undefined;
            location.provinceId = result.id;
        } else if (result.level === 'CITY') {
            location.countryId = result.countryId ?? undefined;
            location.provinceId = result.provinceId ?? undefined;
            location.cityId = result.id;
        } else if (result.level === 'SUBURB') {
            location.countryId = result.countryId ?? undefined;
            location.provinceId = result.provinceId ?? undefined;
            // parentId is the cityId for suburbs
            location.cityId = result.parentId ?? undefined;
            location.suburbId = result.id;
        }

        setSelectedLocation(location);
        setGeoQuery('');
        setShowDropdown(false);
    };

    const clearLocation = () => {
        setSelectedLocation(null);
        setGeoQuery('');
    };

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!sdk) {
            notify.error('Please wait for authentication');
            return;
        }

        if (!selectedLocation?.countryId) {
            notify.error('Please select a location');
            return;
        }

        setIsLoading(true);

        const formData = new FormData(event.currentTarget);
        const title = formData.get('title') as string;
        const description = formData.get('description') as string;
        const price = Number(formData.get('price'));
        const type = formData.get('type') as string;
        const bedrooms = Number(formData.get('bedrooms')) || undefined;
        const bathrooms = Number(formData.get('bathrooms')) || undefined;

        try {
            await sdk.properties.create({
                title,
                description,
                price,
                currency: 'USD',
                type,
                countryId: selectedLocation.countryId,
                provinceId: selectedLocation.provinceId,
                cityId: selectedLocation.cityId,
                suburbId: selectedLocation.suburbId,
                bedrooms,
                bathrooms,
            });

            notify.success('Property listed successfully!');
            router.push('/dashboard/listings');
            router.refresh();
        } catch (error) {
            console.error('Create property error:', error);
            notify.error('Failed to list property. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }

    const groupedResults = useMemo(() => {
        const groups: Record<string, GeoSearchResult[]> = {
            SUBURB: [],
            CITY: [],
            PROVINCE: [],
            COUNTRY: []
        };

        geoResults.forEach(result => {
            if (groups[result.level]) {
                groups[result.level].push(result);
            }
        });

        return groups;
    }, [geoResults]);

    if (!sdk) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                <span className="ml-2 text-slate-600">Loading...</span>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto py-8 px-4">
            <h1 className="text-2xl font-bold mb-6 text-slate-900 dark:text-slate-50">List a New Property</h1>

            <form onSubmit={onSubmit} className="space-y-6 bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
                <div>
                    <Label htmlFor="title">Property Title</Label>
                    <Input id="title" name="title" required placeholder="e.g. Modern 3-Bedroom House in Highlands" className="mt-1" />
                </div>

                <div>
                    <Label htmlFor="description">Description</Label>
                    <textarea
                        id="description"
                        name="description"
                        required
                        rows={4}
                        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder-slate-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                        placeholder="Describe the property..."
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <Label htmlFor="price">Price (USD)</Label>
                        <Input id="price" name="price" type="number" required min="0" className="mt-1" />
                    </div>

                    <div>
                        <Label htmlFor="type">Property Type</Label>
                        <select
                            id="type"
                            name="type"
                            required
                            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                        >
                            {PROPERTY_TYPES.map(pt => (
                                <option key={pt.value} value={pt.value}>{pt.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Location Search */}
                <div>
                    <Label>Location (City or Suburb)</Label>
                    <div className="relative mt-1">
                        {selectedLocation ? (
                            <div className="flex items-center justify-between rounded-md border border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2">
                                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                                    {selectedLocation.displayName}
                                </span>
                                <button
                                    type="button"
                                    onClick={clearLocation}
                                    className="text-emerald-600 hover:text-emerald-800"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        type="text"
                                        value={geoQuery}
                                        onChange={(e) => setGeoQuery(e.target.value)}
                                        placeholder="Search for city or suburb..."
                                        className="pl-10"
                                        onFocus={() => geoResults.length > 0 && setShowDropdown(true)}
                                    />
                                    {isSearching && (
                                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
                                    )}
                                </div>

                                {showDropdown && geoResults.length > 0 && (
                                    <div className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800 max-h-60 overflow-auto">
                                        {Object.entries(groupedResults).map(([level, results]) => {
                                            if (results.length === 0) return null;
                                            return (
                                                <div key={level}>
                                                    <div className="px-3 py-1 text-xs font-semibold text-slate-500 bg-slate-50 dark:bg-slate-900">
                                                        {level === 'SUBURB' && 'Suburbs'}
                                                        {level === 'CITY' && 'Cities'}
                                                        {level === 'PROVINCE' && 'Provinces'}
                                                        {level === 'COUNTRY' && 'Countries'}
                                                    </div>
                                                    {results.map((result) => (
                                                        <button
                                                            key={result.id}
                                                            type="button"
                                                            onClick={() => handleLocationSelect(result)}
                                                            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between"
                                                        >
                                                            <span>{result.name}</span>
                                                            <span className="text-xs text-slate-400">{result.level}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Type to search for cities and suburbs in Zimbabwe</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <Label htmlFor="bedrooms">Bedrooms</Label>
                        <Input id="bedrooms" name="bedrooms" type="number" min="0" className="mt-1" />
                    </div>

                    <div>
                        <Label htmlFor="bathrooms">Bathrooms</Label>
                        <Input id="bathrooms" name="bathrooms" type="number" min="0" className="mt-1" />
                    </div>
                </div>

                <div className="pt-4">
                    <Button
                        type="submit"
                        disabled={isLoading || !selectedLocation}
                        className="w-full justify-center bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        List Property
                    </Button>
                </div>
            </form>
        </div>
    );
}
