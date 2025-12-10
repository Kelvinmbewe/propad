import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Verifications | PropAd Admin'
};

export default function VerificationsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Verifications</h1>
                <p className="text-sm text-neutral-500">Review and approve property verification requests.</p>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
                <p className="text-neutral-600">Verification queue is currently empty.</p>
                <p className="mt-2 text-sm text-neutral-400">New verification requests will appear here.</p>
            </div>
        </div>
    );
}
