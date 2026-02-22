'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { serverApiRequest } from '@/lib/server-api';
import { VerificationItemTypeEnum, type VerificationItemTypeValue } from '@/common/runtime-enums';

// Local status/type constants matching API schema
const VerificationType = {
    AUTO: 'AUTO',
    CALL: 'CALL',
    SITE: 'SITE',
    DOCS: 'DOCS',
} as const;

export async function getPropertyVerification(propertyId: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');

        // TODO: Implement API endpoint
        // return await serverApiRequest(`/properties/${propertyId}/verification`);
        console.warn('[verification.ts] getPropertyVerification - API endpoint not yet implemented');
        return null;
    } catch (error) {
        console.error('getPropertyVerification error:', error);
        return null;
    }
}

export async function requestPropertyVerification(propertyId: string, type: 'OWNERSHIP_PROOF' | 'LOCATION_CHECK' | 'MEDIA_VALIDATION' = 'OWNERSHIP_PROOF') {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    try {
        // Map legacy frontend types to Schema Enum
        let schemaType: VerificationItemTypeValue = VerificationItemTypeEnum.PROOF_OF_OWNERSHIP;
        if (type === 'LOCATION_CHECK') schemaType = VerificationItemTypeEnum.LOCATION_CONFIRMATION;
        if (type === 'MEDIA_VALIDATION') schemaType = VerificationItemTypeEnum.PROPERTY_PHOTOS;

        // TODO: Implement API endpoint
        // const request = await serverApiRequest('/verification-requests', {
        //     method: 'POST',
        //     body: { propertyId, type: schemaType }
        // });
        console.warn('[verification.ts] requestPropertyVerification - API endpoint not yet implemented');

        revalidatePath(`/dashboard/listings/${propertyId}`);
        return {
            id: 'pending',
            targetType: 'PROPERTY',
            targetId: propertyId,
            propertyId,
            requesterId: session.user.id,
            status: 'PENDING',
            items: [{
                type: schemaType,
                status: 'SUBMITTED',
                notes: 'User requested verification'
            }]
        };
    } catch (error) {
        console.error('requestPropertyVerification error:', error);
        throw new Error('Unable to request verification at this time');
    }
}
