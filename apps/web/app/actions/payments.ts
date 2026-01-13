'use server';

import { auth } from '@/auth';
import { serverApiRequest } from '@/lib/server-api';

export async function getPropertyPayments(propertyId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    try {
        return await serverApiRequest(`/properties/${propertyId}/payments`);
    } catch (error) {
        console.error('getPropertyPayments error:', error);
        return [];
    }
}
