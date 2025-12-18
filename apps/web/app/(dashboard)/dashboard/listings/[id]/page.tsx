import { Suspense } from 'react';
import { ListingManagementHub } from '@/components/listing-management-hub';

export default function ListingManagementPage({ params }: { params: { id: string } }) {
    return (
        <Suspense fallback={<p className="text-sm text-neutral-500">Loading details...</p>}>
            <ListingManagementHub propertyId={params.id} />
        </Suspense>
    );
}
