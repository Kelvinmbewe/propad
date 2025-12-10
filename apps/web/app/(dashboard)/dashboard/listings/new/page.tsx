'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Label, notify } from '@propad/ui';
import { Loader2, Search, X, Upload, Plus, MapPin, Image as ImageIcon } from 'lucide-react';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';
import type { GeoSearchResult, PendingGeo } from '@propad/sdk';

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
    pendingGeoId?: string;
    displayName: string;
}

interface UploadedImage {
    key: string;
    previewUrl: string;
    file: File;
}

export default function CreatePropertyPage() {
    const router = useRouter();
    const sdk = useAuthenticatedSDK();
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Geo search state
    const [geoQuery, setGeoQuery] = useState('');
    const [geoResults, setGeoResults] = useState<GeoSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<LocationSelection | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);

    // New location proposal state
    const [showNewLocationForm, setShowNewLocationForm] = useState(false);
    const [newSuburbName, setNewSuburbName] = useState('');
    const [selectedCity, setSelectedCity] = useState<GeoSearchResult | null>(null);
    const [citySearchQuery, setCitySearchQuery] = useState('');
    const [cityResults, setCityResults] = useState<GeoSearchResult[]>([]);
    const [isSearchingCity, setIsSearchingCity] = useState(false);
    const [showCityDropdown, setShowCityDropdown] = useState(false);
    const [isCreatingPending, setIsCreatingPending] = useState(false);

    // Image upload state
    const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
    const [isUploading, setIsUploading] = useState(false);

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

    // City search for new suburb form
    useEffect(() => {
        if (!sdk || citySearchQuery.length < 2) {
            setCityResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearchingCity(true);
            try {
                const results = await sdk.geo.search(citySearchQuery);
                // Only show cities
                setCityResults(results.filter(r => r.level === 'CITY'));
                setShowCityDropdown(true);
            } catch (error) {
                console.error('City search failed:', error);
            } finally {
                setIsSearchingCity(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [citySearchQuery, sdk]);

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
        setShowNewLocationForm(false);
    };

    const handleCreateNewSuburb = async () => {
        if (!sdk || !newSuburbName.trim() || !selectedCity) {
            notify.error('Please enter suburb name and select a city');
            return;
        }

        setIsCreatingPending(true);
        try {
            const pending = await sdk.geo.createPending({
                level: 'SUBURB',
                proposedName: newSuburbName.trim(),
                parentId: selectedCity.id
            });

            // Set the pending geo as location
            setSelectedLocation({
                pendingGeoId: pending.id,
                countryId: selectedCity.countryId ?? undefined,
                provinceId: selectedCity.provinceId ?? undefined,
                cityId: selectedCity.id,
                displayName: `${newSuburbName.trim()}, ${selectedCity.name} (pending approval)`
            });

            notify.success('New location submitted for approval');
            setShowNewLocationForm(false);
            setNewSuburbName('');
            setSelectedCity(null);
            setCitySearchQuery('');
        } catch (error) {
            console.error('Failed to create pending geo:', error);
            notify.error('Failed to submit new location');
        } finally {
            setIsCreatingPending(false);
        }
    };

    const clearLocation = () => {
        setSelectedLocation(null);
        setGeoQuery('');
    };

    const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || !sdk) return;

        setIsUploading(true);
        const newImages: UploadedImage[] = [];

        try {
            for (const file of Array.from(files)) {
                // Create preview URL
                const previewUrl = URL.createObjectURL(file);

                // For now, just store locally - actual upload happens on submit
                newImages.push({
                    key: `temp-${Date.now()}-${file.name}`,
                    previewUrl,
                    file
                });
            }

            setUploadedImages(prev => [...prev, ...newImages]);
        } catch (error) {
            console.error('Image selection error:', error);
            notify.error('Failed to add images');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const removeImage = (index: number) => {
        setUploadedImages(prev => {
            const removed = prev[index];
            if (removed) {
                URL.revokeObjectURL(removed.previewUrl);
            }
            return prev.filter((_, i) => i !== index);
        });
    };

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!sdk) {
            notify.error('Please wait for authentication');
            return;
        }

        if (!selectedLocation?.countryId && !selectedLocation?.pendingGeoId) {
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
            const property = await sdk.properties.create({
                title,
                description,
                price,
                currency: 'USD',
                type,
                countryId: selectedLocation.countryId,
                provinceId: selectedLocation.provinceId,
                cityId: selectedLocation.cityId,
                suburbId: selectedLocation.suburbId,
                pendingGeoId: selectedLocation.pendingGeoId,
                bedrooms,
                bathrooms,
            });

            // TODO: Upload images after property is created
            // For each image, get signed URL and upload
            if (uploadedImages.length > 0) {
                notify.success(`Property created with ${uploadedImages.length} images (upload pending)`);
            }

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

                {/* Image Upload */}
                <div>
                    <Label>Property Images</Label>
                    <div className="mt-2">
                        <div className="grid grid-cols-3 gap-3 mb-3">
                            {uploadedImages.map((img, index) => (
                                <div key={img.key} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                                    <img
                                        src={img.previewUrl}
                                        alt={`Property ${index + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(index)}
                                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}

                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="aspect-square rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-emerald-500 flex flex-col items-center justify-center text-slate-400 hover:text-emerald-500 transition-colors"
                            >
                                {isUploading ? (
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                ) : (
                                    <>
                                        <ImageIcon className="h-6 w-6 mb-1" />
                                        <span className="text-xs">Add Photo</span>
                                    </>
                                )}
                            </button>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleImageSelect}
                        />
                        <p className="text-xs text-slate-500">Upload up to 10 images. JPG, PNG or WebP.</p>
                    </div>
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
                        ) : showNewLocationForm ? (
                            <div className="space-y-3 p-3 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-900/50">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Add New Suburb</span>
                                    <button
                                        type="button"
                                        onClick={() => setShowNewLocationForm(false)}
                                        className="text-slate-500 hover:text-slate-700"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                <div>
                                    <Label className="text-xs">Suburb Name</Label>
                                    <Input
                                        value={newSuburbName}
                                        onChange={(e) => setNewSuburbName(e.target.value)}
                                        placeholder="e.g. Kelvins Park"
                                        className="mt-1"
                                    />
                                </div>

                                <div className="relative">
                                    <Label className="text-xs">City/Town</Label>
                                    {selectedCity ? (
                                        <div className="mt-1 flex items-center justify-between rounded-md border border-blue-500 bg-blue-50 dark:bg-blue-900/20 px-3 py-2">
                                            <span className="text-sm text-blue-700 dark:text-blue-300">
                                                {selectedCity.name}{selectedCity.provinceName ? ` (${selectedCity.provinceName})` : ''}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => { setSelectedCity(null); setCitySearchQuery(''); }}
                                                className="text-blue-600"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="relative mt-1">
                                                <Input
                                                    value={citySearchQuery}
                                                    onChange={(e) => setCitySearchQuery(e.target.value)}
                                                    placeholder="Search for city..."
                                                    onFocus={() => cityResults.length > 0 && setShowCityDropdown(true)}
                                                />
                                                {isSearchingCity && (
                                                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
                                                )}
                                            </div>
                                            {showCityDropdown && cityResults.length > 0 && (
                                                <div className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800 max-h-40 overflow-auto">
                                                    {cityResults.map((city) => (
                                                        <button
                                                            key={city.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedCity(city);
                                                                setCitySearchQuery('');
                                                                setShowCityDropdown(false);
                                                            }}
                                                            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                                                        >
                                                            {city.name}{city.provinceName ? ` (${city.provinceName})` : ''}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                <Button
                                    type="button"
                                    onClick={handleCreateNewSuburb}
                                    disabled={isCreatingPending || !newSuburbName.trim() || !selectedCity}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    {isCreatingPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <Plus className="h-4 w-4 mr-2" />
                                    )}
                                    Submit New Suburb
                                </Button>
                                <p className="text-xs text-slate-500">
                                    New suburbs require admin approval but you can still create your listing.
                                </p>
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

                                {geoQuery.length >= 2 && !isSearching && geoResults.length === 0 && (
                                    <div className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800 p-3">
                                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                                            No locations found for "{geoQuery}"
                                        </p>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setNewSuburbName(geoQuery);
                                                setShowNewLocationForm(true);
                                                setShowDropdown(false);
                                            }}
                                            className="w-full"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add "{geoQuery}" as new suburb
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                        Search for your suburb. Can't find it? You can add it!
                    </p>
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
                        disabled={isLoading || (!selectedLocation?.countryId && !selectedLocation?.pendingGeoId)}
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
