import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { MessageSquare, Check, X } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getLandlordInterests(userId: string) {
  // Find properties owned by the user (as landlord or agent)
  // And get all interests for those properties
  const interests = await prisma.interest.findMany({
    where: {
      property: {
        OR: [
          { landlordId: userId },
          { agentOwnerId: userId }
        ]
      }
    },
    include: {
      property: {
        select: {
          id: true,
          title: true,
          price: true,
          currency: true
        }
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          isVerified: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return interests;
}

export default async function InterestsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const interests = await getLandlordInterests(session.user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Interest Requests</h1>
        <p className="text-slate-500">Manage expressions of interest and offers for your properties.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {interests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-slate-500">No interest requests found yet.</p>
          </div>
        ) : (
          <ul role="list" className="divide-y divide-slate-100">
            {interests.map((interest) => (
              <li key={interest.id} className="p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Link href={`/users/${interest.user.id}`} className="font-semibold text-slate-900 hover:underline hover:text-emerald-600">
                        {interest.user.name || 'Anonymous User'}
                      </Link>
                      {interest.user.isVerified && (
                         <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                           Verified
                         </span>
                      )}
                      <span className="text-sm text-slate-500">
                        on <Link href={`/properties/${interest.property.id}`} className="text-emerald-600 hover:underline">{interest.property.title}</Link>
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                      <span>Status: <span className="font-medium capitalize text-slate-700">{interest.status.toLowerCase()}</span></span>
                      <span>•</span>
                      <span>{new Date(interest.createdAt).toLocaleDateString()}</span>
                    </div>

                    {interest.offerAmount && (
                      <div className="mt-2">
                        <span className="font-medium text-slate-900">
                          Offer: {interest.property.currency} {Number(interest.offerAmount).toLocaleString()}
                        </span>
                        <span className="ml-2 text-sm text-slate-500">
                          (Listed: {Number(interest.property.price).toLocaleString()})
                        </span>
                      </div>
                    )}

                    {interest.message && (
                      <p className="mt-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        "{interest.message}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                     {/* Client component wrapper for actions would be better, but using form actions for simplicity in this step */}
                     {interest.status === 'PENDING' && (
                        <form action={async () => {
                            'use server';
                            const { acceptInterest } = await import('@/app/actions/landlord');
                            await acceptInterest(interest.id);
                        }}>
                             <button
                               type="submit"
                               className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                             >
                                <Check className="h-4 w-4" />
                                Accept
                             </button>
                        </form>
                     )}
                    <button className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                      <MessageSquare className="h-4 w-4" />
                      Chat
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
