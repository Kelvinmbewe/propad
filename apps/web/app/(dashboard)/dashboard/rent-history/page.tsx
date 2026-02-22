import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { RentPaymentForm } from '@/components/rent-payment-form';
import { CheckCircle, Clock } from 'lucide-react';
import { serverApiRequest } from '@/lib/server-api';

export const dynamic = 'force-dynamic';

interface RentPayment {
    id: string;
    paidAt: string;
    amount: number;
    currency: string;
    isVerified: boolean;
    property: { title: string };
}

async function getRentHistory(userId: string): Promise<RentPayment[]> {
    try {
        // TODO: Implement API endpoint
        // return await serverApiRequest<RentPayment[]>('/rent-payments');
        console.warn('[rent-history/page.tsx] getRentHistory - API endpoint not yet implemented');
        return [];
    } catch (error) {
        console.error('Failed to fetch rent history:', error);
        return [];
    }
}

async function getTenantProperties(userId: string): Promise<{ id: string; title: string }[]> {
    try {
        // TODO: Implement API endpoint
        // return await serverApiRequest<any[]>('/properties/my-rentals');
        console.warn('[rent-history/page.tsx] getTenantProperties - API endpoint not yet implemented');
        return [];
    } catch (error) {
        console.error('Failed to fetch tenant properties:', error);
        return [];
    }
}

export default async function RentHistoryPage() {
    const session = await auth();
    if (!session?.user?.id) {
        redirect('/auth/signin');
    }

    const payments = await getRentHistory(session.user.id);
    const properties = await getTenantProperties(session.user.id);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Rent History & Credit Building</h1>
                <p className="text-slate-500">Log your rent payments to build a verifiable credit history.</p>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Log Payment Form */}
                <div>
                    <RentPaymentForm properties={properties} />
                </div>

                {/* History List */}
                <div className="lg:col-span-2">
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 px-6 py-4">
                            <h3 className="font-semibold text-slate-900">Payment History</h3>
                        </div>
                        {payments.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                No payments logged yet.
                            </div>
                        ) : (
                            <ul role="list" className="divide-y divide-slate-100">
                                {payments.map((payment) => (
                                    <li key={payment.id} className="flex items-center justify-between px-6 py-4">
                                        <div>
                                            <p className="font-medium text-slate-900">{payment.property.title}</p>
                                            <p className="text-sm text-slate-500">
                                                Paid on {new Date(payment.paidAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-slate-900">
                                                {payment.currency} {Number(payment.amount).toLocaleString()}
                                            </p>
                                            <div className="mt-1 flex items-center justify-end gap-1 text-xs">
                                                {payment.isVerified ? (
                                                    <span className="flex items-center gap-1 text-emerald-600">
                                                        <CheckCircle className="h-3 w-3" /> Verified
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-amber-600">
                                                        <Clock className="h-3 w-3" /> Pending
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
