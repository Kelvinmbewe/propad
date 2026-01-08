'use server';

import { auth } from '@/auth';
import { serverApiRequest } from '@/lib/server-api';

export async function getPropertyPayments(propertyId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    try {
        // TODO: Implement API endpoint
        // return await serverApiRequest(`/properties/${propertyId}/payments`);
        console.warn('[payments.ts] getPropertyPayments - API endpoint not yet implemented');

        // Return mock data for now
        return [
            { id: '1', type: 'SERVICE_FEE', amount: 50, currency: 'USD', status: 'COMPLETED', date: new Date().toISOString(), description: 'Agent Service Fee - Oct' },
            { id: '2', type: 'FEATURED_LISTING', amount: 20, currency: 'USD', status: 'PENDING', date: new Date().toISOString(), description: 'Featured Listing (7 Days)' }
        ];
    } catch (error) {
        console.error('getPropertyPayments error:', error);
        return [];
    }
}
