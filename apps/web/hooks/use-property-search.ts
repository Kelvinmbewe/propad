import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedSDK } from './use-authenticated-sdk';
import { PropertyType } from '@propad/sdk/dist/types';

export interface PropertyFilters {
    type?: string;
    priceMin?: number;
    priceMax?: number;
    bedrooms?: number;
    bathrooms?: number;
    location?: string; // Generic search term for now
    verifiedOnly?: boolean;
    sort?: 'RELEVANCE' | 'NEWEST' | 'PRICE_ASC' | 'PRICE_DESC';
    page?: number;
    limit?: number;
}

export function usePropertySearch(filters: PropertyFilters) {
    const sdk = useAuthenticatedSDK();

    // Construct query string manually or via URLSearchParams
    const queryKey = ['properties:search', filters];

    return useQuery({
        queryKey,
        queryFn: async () => {
            if (!sdk) return { properties: [], total: 0 };

            // Build query params
            const params = new URLSearchParams();
            if (filters.type) params.append('type', filters.type);
            if (filters.priceMin) params.append('priceMin', filters.priceMin.toString());
            if (filters.priceMax) params.append('priceMax', filters.priceMax.toString());
            if (filters.bedrooms) params.append('bedrooms', filters.bedrooms.toString());
            if (filters.bathrooms) params.append('bathrooms', filters.bathrooms.toString());
            if (filters.verifiedOnly) params.append('verifiedOnly', 'true');
            if (filters.sort) params.append('sort', filters.sort);
            if (filters.page) params.append('page', filters.page.toString());
            if (filters.limit) params.append('limit', filters.limit.toString());

            // TODO: handle location search properly (cityId vs suburbId)

            const response = await sdk.request(`/properties/search?${params.toString()}`, { method: 'GET' });
            return response as any[]; // Expected to be array or { data: [], total: number } depending on backend pagination
        },
        enabled: !!sdk,
        keepPreviousData: true
    });
}
