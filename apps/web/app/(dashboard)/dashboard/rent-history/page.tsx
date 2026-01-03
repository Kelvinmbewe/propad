import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { RentPaymentForm } from '@/components/rent-payment-form';
import { CheckCircle, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getRentHistory(userId: string) {
    const payments = await prisma.rentPayment.findMany({
        where: { tenantId: userId },
        include: {
            property: {
                select: { title: true }
            }
        },
        orderBy: { paidAt: 'desc' }
    });
    return payments;
}

async function getTenantProperties(userId: string) {
    // In a real app, we'd query leases or active rentals.
    // For now, we fetch all properties to let the user select (self-reporting)
    // Or ideally, properties where they have an ACCEPTED interest?
    // Let's filter properties where they have an accepted interest for better UX.
    const interests = await prisma.interest.findMany({
        where: { userId, status: 'ACCEPTED' },
        include: { property: true }
    });

    // If no accepted interests, maybe they are renting outside the system or we just show all?
    // Let's fallback to showing all active properties if list is empty to allow for "logging past rent" logic
    // But logically, they should only pay for what they rent.
    // For this task, I'll pass the properties they "connected" with.

    if (interests.length > 0) {
        return interests.map((i: { property: { id: string; title: string } }) => ({ id: i.property.id, title: i.property.title }));
    }

    // Fallback: Just return top 50 properties to pick from (for demo purposes if they haven't done the full flow)
    const all = await prisma.property.findMany({ take: 50, select: { id: true, title: true } });
    return all;
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
