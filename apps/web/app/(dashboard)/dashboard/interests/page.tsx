import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { InterestActions } from '@/components/interest-actions';

import { serverApiRequest } from '@/lib/server-api';

export const dynamic = 'force-dynamic';


interface Interest {
  id: string;
  status: string;
  createdAt: string;
  message: string | null;
  offerAmount: number | null;
  property: {
    id: string;
    title: string;
    price: number;
    currency: string;
    landlordId: string;
    agentOwnerId: string | null;
  };
  user: {
    id: string;
    name: string | null;
    email: string;
    isVerified: boolean;
  };
}

async function getLandlordInterests(): Promise<Interest[]> {
  try {
    return await serverApiRequest<Interest[]>('/interests/landlord');
  } catch (error) {
    console.error('Failed to fetch landlord interests:', error);
    return [];
  }
}


export default async function InterestsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const interests = await getLandlordInterests();


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

                  <InterestActions
                    interestId={interest.id}
                    propertyId={interest.property.id}
                    status={interest.status}
                    landlordId={interest.property.landlordId}
                    agentOwnerId={interest.property.agentOwnerId}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
