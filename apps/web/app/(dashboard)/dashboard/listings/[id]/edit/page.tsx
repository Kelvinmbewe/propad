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

const SUGGESTED_AMENITIES = [
    'Borehole',
    'Solar',
    'Security',
    'Garage',
    'Garden',
    'Swimming Pool',
    'Power Backup',
    'Internet',
    'Water Tank',
    'Walled',
] as const;

interface LocationSelection {
    countryId?: string;
    provinceId?: string;
    cityId?: string;
    suburbId?: string;
    pendingGeoId?: string;
    displayName: string;
}

export default function EditPropertyPage() {
    const router = useRouter();
    const params = useParams();
    const propertyId = params.id as string;
    const sdk = useAuthenticatedSDK();
    const queryClient = useQueryClient();
    const [isLoading, setIsLoading] = useState(false);
    const [externalImageUrl, setExternalImageUrl] = useState('');
    const [isAddingExternalImage, setIsAddingExternalImage] = useState(false);
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
    const [amenities, setAmenities] = useState<string[]>([]);
    const [amenityInput, setAmenityInput] = useState('');

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
            // Use suburbName (which now includes pending suburb with "(pending)" suffix) or pending geo name
            if ((property as any).suburbName) {
                locationParts.push((property as any).suburbName);
            } else if ((property as any).location?.pendingGeo?.proposedName) {
                locationParts.push(`${(property as any).location.pendingGeo.proposedName} (pending)`);
            }
            if ((property as any).cityName) locationParts.push((property as any).cityName);
            if ((property as any).provinceName) locationParts.push((property as any).provinceName);

            if (locationParts.length > 0 || (property as any).pendingGeoId) {
                setSelectedLocation({
                    countryId: (property as any).countryId,
                    provinceId: (property as any).provinceId,
                    cityId: (property as any).cityId,
                    suburbId: (property as any).suburbId,
                    pendingGeoId: (property as any).pendingGeoId,
                    displayName: locationParts.join(', ') || 'Pending location',
                });
            }

            setAmenities(Array.isArray((property as any).amenities) ? (property as any).amenities : []);
        }
    }, [property]);

    const addAmenity = (value: string) => {
        const cleaned = value.trim();
        if (!cleaned) return;
        setAmenities((prev) => {
            if (prev.some((item) => item.toLowerCase() === cleaned.toLowerCase())) {
                return prev;
            }
            return [...prev, cleaned];
        });
    };

    const toggleSuggestedAmenity = (value: string) => {
        setAmenities((prev) =>
            prev.some((item) => item.toLowerCase() === value.toLowerCase())
                ? prev.filter((item) => item.toLowerCase() !== value.toLowerCase())
                : [...prev, value],
        );
    };

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

        const title = formData.title?.trim();
        const description = formData.description?.trim() || undefined;
        const price = Number(formData.price);
        const bedrooms = formData.bedrooms ? Number(formData.bedrooms) : undefined;
        const bathrooms = formData.bathrooms ? Number(formData.bathrooms) : undefined;
        const areaSqm = formData.areaSqm ? Number(formData.areaSqm) : undefined;

        if (!title || title.length === 0) {
            notify.error('Property title is required');
            setIsLoading(false);
            return;
        }

        if (price <= 0 || isNaN(price)) {
            notify.error('Price must be a positive number');
            setIsLoading(false);
            return;
        }

        try {
            // Clean payload: remove undefined and empty string values
            const payload: any = {
                title,
                price,
                type: formData.type as any,
            };

            // Only include optional fields if they have values
            if (description) payload.description = description;
            if (formData.listingIntent) payload.listingIntent = formData.listingIntent;
            if (bedrooms !== undefined) payload.bedrooms = bedrooms;
            if (bathrooms !== undefined) payload.bathrooms = bathrooms;
            if (areaSqm !== undefined) payload.areaSqm = areaSqm;
            payload.amenities = amenities;

            // Only include location fields if they have values
            // If pendingGeoId is present, only send that (not regular location fields)
            const location = selectedLocation;
            if (location?.pendingGeoId) {
                payload.pendingGeoId = location.pendingGeoId;
            } else if (location) {
                // Only send regular location fields if no pendingGeoId
                if (location.countryId) payload.countryId = location.countryId;
                if (location.provinceId) payload.provinceId = location.provinceId;
                if (location.cityId) payload.cityId = location.cityId;
                if (location.suburbId) payload.suburbId = location.suburbId;
            }

            await sdk.properties.update(propertyId, payload);

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

                <div>
                    <Label>Amenities</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {SUGGESTED_AMENITIES.map((amenity) => {
                            const selected = amenities.some((item) => item.toLowerCase() === amenity.toLowerCase());
                            return (
                                <button
                                    key={amenity}
                                    type="button"
                                    disabled={isReadOnly}
                                    onClick={() => toggleSuggestedAmenity(amenity)}
                                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                                        selected
                                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                            : 'border-slate-300 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700'
                                    }`}
                                >
                                    {amenity}
                                </button>
                            );
                        })}
                    </div>
                    <div className="mt-3 flex gap-2">
                        <Input
                            value={amenityInput}
                            onChange={(event) => setAmenityInput(event.target.value)}
                            placeholder="Add custom amenity"
                            disabled={isReadOnly}
                        />
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isReadOnly}
                            onClick={() => {
                                addAmenity(amenityInput);
                                setAmenityInput('');
                            }}
                        >
                            Add
                        </Button>
                    </div>
                    {amenities.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                            {amenities.map((amenity) => (
                                <span
                                    key={amenity}
                                    className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                                >
                                    {amenity}
                                    {!isReadOnly ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setAmenities((prev) => prev.filter((item) => item !== amenity))
                                            }
                                            className="text-emerald-700"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    ) : null}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="mt-2 text-xs text-slate-500">Select common amenities or add your own.</p>
                    )}
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

                    <div className="mt-6 space-y-2">
                        <Label htmlFor="externalImageUrl">Add external image URL (S3/hosted)</Label>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Input
                                id="externalImageUrl"
                                value={externalImageUrl}
                                onChange={(e) => setExternalImageUrl(e.target.value)}
                                placeholder="https://your-bucket.s3.amazonaws.com/property.jpg"
                                disabled={isReadOnly || isAddingExternalImage}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isReadOnly || isAddingExternalImage}
                                onClick={async () => {
                                    if (!sdk) {
                                        notify.error('Please wait for authentication');
                                        return;
                                    }
                                    if (!externalImageUrl.trim()) {
                                        notify.error('Please enter a valid URL');
                                        return;
                                    }
                                    setIsAddingExternalImage(true);
                                    try {
                                        await sdk.request(`properties/${propertyId}/media/link`, {
                                            method: 'POST',
                                            body: { url: externalImageUrl.trim() }
                                        });
                                        setExternalImageUrl('');
                                        queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
                                        notify.success('External image added');
                                    } catch (error) {
                                        console.error('Failed to link external image:', error);
                                        notify.error('Failed to add external image');
                                    } finally {
                                        setIsAddingExternalImage(false);
                                    }
                                }}
                            >
                                {isAddingExternalImage ? 'Adding...' : 'Add URL'}
                            </Button>
                        </div>
                        <p className="text-xs text-slate-500">
                            Use this if you host images on S3 or another CDN. The URL must be publicly accessible.
                        </p>
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
