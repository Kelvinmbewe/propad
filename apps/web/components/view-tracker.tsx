'use client';

import { useEffect, useRef } from 'react';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';

export function ViewTracker({ propertyId }: { propertyId: string }) {
    const sdk = useAuthenticatedSDK(); // Or just public fetch if strict auth not needed for view
    const fired = useRef(false);

    useEffect(() => {
        if (fired.current || !propertyId) return;

        const track = async () => {
            try {
                // Use direct fetch if SDK not ready or public endpoint dependent
                // Assuming /api/proxy or direct URL 
                // For now, let's use a fire-and-forget fetch to the Next.js API route proxy or direct
                // Since we are in client, we might need the SDK or standard fetch
                await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/properties/${propertyId}/view`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (e) {
                // ignore
            }
        };
        track();
        fired.current = true;
    }, [propertyId]);

    return null;
}
