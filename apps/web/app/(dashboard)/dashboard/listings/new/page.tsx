'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Label, notify } from '@propad/ui';
import { Loader2 } from 'lucide-react';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';

export default function CreatePropertyPage() {
    const router = useRouter();
    const sdk = useAuthenticatedSDK();
    const [isLoading, setIsLoading] = useState(false);

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!sdk) return;

        setIsLoading(true);

        const formData = new FormData(event.currentTarget);
        const title = formData.get('title') as string;
        const description = formData.get('description') as string;
        const price = Number(formData.get('price'));
        const type = formData.get('type') as string;
        const city = formData.get('city') as string;
        const suburb = formData.get('suburb') as string;
        const bedrooms = Number(formData.get('bedrooms'));
        const bathrooms = Number(formData.get('bathrooms'));
        const area = Number(formData.get('area'));

        try {
            await sdk.properties.create({
                title,
                description,
                price,
                currency: 'USD',
                type: type as any,
                status: 'DRAFT',
                location: {
                    city: { name: city },
                    suburb: { name: suburb },
                    country: { name: 'Zimbabwe' }
                },
                attributes: {
                    bedrooms,
                    bathrooms,
                    areaSqM: area
                }
            });

            notify.success('Property listed successfully!');
            router.push('/dashboard/listings');
            router.refresh();
        } catch (error) {
            notify.error('Failed to list property. Please try again.');
        } finally {
            setIsLoading(false);
        }
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
                            <option value="RESIDENTIAL_SALE">Residential Sale</option>
                            <option value="RESIDENTIAL_RENTAL">Residential Rental</option>
                            <option value="COMMERCIAL_SALE">Commercial Sale</option>
                            <option value="COMMERCIAL_RENTAL">Commercial Rental</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <Label htmlFor="city">City</Label>
                        <Input id="city" name="city" required defaultValue="Harare" className="mt-1" />
                    </div>

                    <div>
                        <Label htmlFor="suburb">Suburb</Label>
                        <Input id="suburb" name="suburb" required placeholder="e.g. Avondale" className="mt-1" />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                    <div>
                        <Label htmlFor="bedrooms">Bedrooms</Label>
                        <Input id="bedrooms" name="bedrooms" type="number" required min="0" className="mt-1" />
                    </div>

                    <div>
                        <Label htmlFor="bathrooms">Bathrooms</Label>
                        <Input id="bathrooms" name="bathrooms" type="number" required min="0" step="0.5" className="mt-1" />
                    </div>

                    <div>
                        <Label htmlFor="area">Area (m²)</Label>
                        <Input id="area" name="area" type="number" required min="0" className="mt-1" />
                    </div>
                </div>

                <div className="pt-4">
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full justify-center bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        List Property
                    </Button>
                </div>
            </form>
        </div>
    );
}
