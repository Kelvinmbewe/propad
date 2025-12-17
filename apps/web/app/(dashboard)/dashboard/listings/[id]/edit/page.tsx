'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Label, notify } from '@propad/ui';
import { Loader2, Search, X, MapPin, Image as ImageIcon, Trash2 } from 'lucide-react';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';
import type { GeoSearchResult } from '@propad/sdk';
import { getImageUrl } from '@/lib/image-url';

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

const LISTING_INTENTS = [
    { value: 'FOR_SALE', label: 'For Sale' },
    { value: 'TO_RENT', label: 'To Rent' },
] as const;

interface LocationSelection {
    countryId?: string;
    provinceId?: string;
    cityId?: string;
    suburbId?: string;
    displayName: string;
}

export default function EditPropertyPage() {
    const router = useRouter();
    const params = useParams();
    const propertyId = params.id as string;
    const sdk = useAuthenticatedSDK();
    const queryClient = useQueryClient();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: '',
        type: 'HOUSE',
        listingIntent: 'FOR_SALE',
        bedrooms: '',
        bathrooms: '',
        areaSqm: '',
    });

    // Geo search state
    const [geoQuery, setGeoQuery] = useState('');
    const [geoResults, setGeoResults] = useState<GeoSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<LocationSelection | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);

    const { data: property, isLoading: loadingProperty, isError } = useQuery({
        queryKey: ['property', propertyId],
        queryFn: () => sdk!.properties.get(propertyId),
        enabled: !!sdk && !!propertyId,
    });

    // Populate form when property loads
    useEffect(() => {
        if (property) {
            setFormData({
                title: property.title || '',
                description: property.description || '',
                price: String(property.price ?? ''),
                type: property.type || 'HOUSE',
                listingIntent: (property as any).listingIntent || 'FOR_SALE',
                bedrooms: String(property.bedrooms ?? ''),
                bathrooms: String(property.bathrooms ?? ''),
                areaSqm: String((property as any).areaSqm ?? ''),
            });

            // Set location
            const locationParts = [];
            if ((property as any).suburbName) locationParts.push((property as any).suburbName);
            if ((property as any).cityName) locationParts.push((property as any).cityName);
            if ((property as any).provinceName) locationParts.push((property as any).provinceName);

            if (locationParts.length > 0) {
                setSelectedLocation({
                    countryId: (property as any).countryId,
                    provinceId: (property as any).provinceId,
                    cityId: (property as any).cityId,
                    suburbId: (property as any).suburbId,
                    displayName: locationParts.join(', '),
                });
            }
        }
    }, [property]);

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

    const formatLocationDisplay = (result: GeoSearchResult) => {
        if (result.level === 'SUBURB' && result.cityName) {
            return `${result.name}, ${result.cityName}`;
        }
        if (result.level === 'CITY' && result.provinceName) {
            return `${result.name} (${result.provinceName})`;
        }
        return result.name;
    };

    const handleLocationSelect = (result: GeoSearchResult) => {
        const location: LocationSelection = {
            displayName: formatLocationDisplay(result)
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

        setIsLoading(true);

        try {
            await sdk.properties.update(propertyId, {
                title: formData.title,
                description: formData.description,
                price: Number(formData.price),
                type: formData.type,
                listingIntent: formData.listingIntent,
                countryId: selectedLocation?.countryId,
                provinceId: selectedLocation?.provinceId,
                cityId: selectedLocation?.cityId,
                suburbId: selectedLocation?.suburbId,
                bedrooms: Number(formData.bedrooms) || undefined,
                bathrooms: Number(formData.bathrooms) || undefined,
                areaSqm: Number(formData.areaSqm) || undefined,
            } as any);

            notify.success('Property updated successfully!');
            queryClient.invalidateQueries({ queryKey: ['properties:owned'] });
            router.push('/dashboard/listings');
            router.refresh();
        } catch (error) {
            console.error('Update property error:', error);
            notify.error('Failed to update property. Please try again.');
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

    if (!sdk || loadingProperty) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                <span className="ml-2 text-slate-600">Loading property...</span>
            </div>
        );
    }

    if (isError || !property) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <p className="text-red-600">Property not found or you don't have access.</p>
                <Button onClick={() => router.push('/dashboard/listings')} className="mt-4">
                    Back to Listings
                </Button>
            </div>
        );
    }

    const isDealConfirmed = (property as any).dealConfirmedAt !== null && (property as any).dealConfirmedAt !== undefined;
    const isReadOnly = isDealConfirmed;

    return (
        <div className="max-w-2xl mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Edit Property</h1>
                {isDealConfirmed && (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        Deal Confirmed - Read Only
                    </span>
                )}
            </div>

            {isDealConfirmed && (
                <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                    This property has a confirmed deal and cannot be edited. Please contact support if you need to make changes.
                </div>
            )}

            <form onSubmit={onSubmit} className="space-y-6 bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
                <div>
                    <Label htmlFor="title">Property Title</Label>
                    <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                        placeholder="e.g. Modern 3-Bedroom House in Highlands"
                        className="mt-1"
                        disabled={isReadOnly}
                    />
                </div>

                <div>
                    <Label htmlFor="description">Description</Label>
                    <textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={4}
                        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder-slate-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                        placeholder="Describe the property..."
                        disabled={isReadOnly}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <Label htmlFor="listingIntent">Listing Type</Label>
                        <select
                            id="listingIntent"
                            value={formData.listingIntent}
                            onChange={(e) => setFormData({ ...formData, listingIntent: e.target.value })}
                            required
                            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                            disabled={isReadOnly}
                        >
                            {LISTING_INTENTS.map(li => (
                                <option key={li.value} value={li.value}>{li.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <Label htmlFor="price">Price (USD)</Label>
                        <Input
                            id="price"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            type="number"
                            required
                            min="0"
                            className="mt-1"
                            disabled={isReadOnly}
                        />
                    </div>

                    <div>
                        <Label htmlFor="type">Property Type</Label>
                        <select
                            id="type"
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            required
                            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                            disabled={isReadOnly}
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
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-emerald-600" />
                                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                                        {selectedLocation.displayName}
                                    </span>
                                </div>
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
                                                    <div className="px-3 py-1 text-xs font-semibold text-slate-500 bg-slate-50 dark:bg-slate-900 sticky top-0">
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
                                                            <span>{formatLocationDisplay(result)}</span>
                                                            <span className="text-xs text-slate-400 capitalize">{result.level.toLowerCase()}</span>
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
                </div>

                <div className="grid grid-cols-3 gap-6">
                    <div>
                        <Label htmlFor="bedrooms">Bedrooms</Label>
                        <Input
                            id="bedrooms"
                            value={formData.bedrooms}
                            onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                            type="number"
                            min="0"
                            className="mt-1"
                        />
                    </div>

                    <div>
                        <Label htmlFor="bathrooms">Bathrooms</Label>
                        <Input
                            id="bathrooms"
                            value={formData.bathrooms}
                            onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                            type="number"
                            min="0"
                            className="mt-1"
                        />
                    </div>

                    <div>
                        <Label htmlFor="areaSqm">Area (m²)</Label>
                        <Input
                            id="areaSqm"
                            value={formData.areaSqm}
                            onChange={(e) => setFormData({ ...formData, areaSqm: e.target.value })}
                            type="number"
                            min="0"
                            step="0.01"
                            className="mt-1"
                            placeholder="e.g. 150"
                        />
                    </div>
                </div>

                {/* Image Management Section */}
                <div className="pt-4 border-t">
                    <Label className="text-lg font-semibold">Property Images</Label>

                    {/* Existing Images */}
                    {property.media && property.media.length > 0 ? (
                        <div className="grid grid-cols-3 gap-4 mt-4">
                            {property.media.map((media: { id: string; url: string; kind: string }) => {
                                const src = getImageUrl(media.url);

                                return (
                                    <div key={media.id} className="relative group">
                                        <img
                                            src={src}
                                            alt="Property"
                                            className="w-full h-32 object-cover rounded-lg"
                                            onError={(e) => {
                                                console.error('Image load error:', src, e);
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = 'none';
                                                const parent = target.parentElement;
                                                if (parent && !parent.querySelector('.image-error')) {
                                                    const errorDiv = document.createElement('div');
                                                    errorDiv.className = 'image-error w-full h-32 flex items-center justify-center bg-red-50 border border-red-200 rounded-lg text-xs text-red-600';
                                                    errorDiv.textContent = 'Image failed to load';
                                                    parent.appendChild(errorDiv);
                                                }
                                            }}
                                        />
                                        <button
                                            type="button"
                            onClick={async () => {
                                if (isReadOnly) {
                                    notify.error('Cannot delete images for confirmed deals');
                                    return;
                                }
                                try {
                                    await sdk.properties.deleteMedia(propertyId, media.id);
                                    queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
                                    notify.success('Image deleted');
                                } catch (e) {
                                    notify.error('Failed to delete image');
                                }
                            }}
                            disabled={isReadOnly}
                                            className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-slate-500 mt-2">No images uploaded yet.</p>
                    )}

                    {/* Upload New Images */}
                    <div className="mt-4">
                        <Label htmlFor="newImages" className="cursor-pointer">
                            <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-emerald-500 transition-colors">
                                <ImageIcon className="h-8 w-8 mx-auto text-slate-400" />
                                <p className="mt-2 text-sm text-slate-600">Click to upload new images</p>
                            </div>
                        </Label>
                        <input
                            id="newImages"
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={async (e) => {
                                if (isReadOnly) {
                                    notify.error('Cannot upload images for confirmed deals');
                                    e.target.value = '';
                                    return;
                                }
                                const files = e.target.files;
                                if (!files || files.length === 0) return;

                                let uploadedCount = 0;
                                for (const file of Array.from(files)) {
                                    try {
                                        await sdk.properties.uploadMedia(propertyId, file);
                                        uploadedCount++;
                                    } catch (err) {
                                        console.error('Upload failed:', err);
                                    }
                                }

                                if (uploadedCount > 0) {
                                    queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
                                    notify.success(`${uploadedCount} image(s) uploaded`);
                                }
                                e.target.value = '';
                            }}
                            disabled={isReadOnly}
                        />
                    </div>
                </div>

                <div className="pt-4 flex gap-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push('/dashboard/listings')}
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={isLoading || isReadOnly}
                        className="flex-1 justify-center bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isReadOnly ? 'Editing Disabled (Deal Confirmed)' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
