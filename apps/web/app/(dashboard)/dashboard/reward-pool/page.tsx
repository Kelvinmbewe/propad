import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Reward Pool | PropAd Admin'
};

export default function RewardPoolPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Reward Pool</h1>
                <p className="text-sm text-neutral-500">Manage agent commissions and reward distributions.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-neutral-200 bg-white p-6">
                    <p className="text-sm font-medium text-neutral-500">Total Pool Balance</p>
                    <p className="mt-2 text-3xl font-bold">$0.00</p>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-white p-6">
                    <p className="text-sm font-medium text-neutral-500">Pending Payouts</p>
                    <p className="mt-2 text-3xl font-bold">0</p>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-white p-6">
                    <p className="text-sm font-medium text-neutral-500">Distributed This Month</p>
                    <p className="mt-2 text-3xl font-bold">$0.00</p>
                </div>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
                <p className="text-neutral-600">No reward distributions pending.</p>
                <p className="mt-2 text-sm text-neutral-400">Agent commissions and payouts will appear here.</p>
            </div>
        </div>
    );
}
