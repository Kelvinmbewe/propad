import { notFound } from 'next/navigation';
import { UserProfileReviews } from '@/components/reviews/user-profile-reviews';
import { ShieldCheck, User } from 'lucide-react';
import { LandingNav } from '@/components/landing-nav';
import { serverPublicApiRequest } from '@/lib/server-api';

export const dynamic = 'force-dynamic';

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  isVerified: boolean;
  createdAt: string;
  role: string;
  agentProfile?: { bio?: string };
  landlordProfile?: { companyName?: string };
}

async function getUser(id: string): Promise<UserProfile | null> {
  try {
    // TODO: Implement API endpoint
    // return await serverPublicApiRequest<UserProfile>(`/users/${id}/profile`);
    console.warn('[users/[id]/page.tsx] getUser - API endpoint not yet implemented');

    // Return placeholder data until API is ready
    return {
      id,
      name: 'User Profile',
      email: 'user@example.com',
      isVerified: false,
      createdAt: new Date().toISOString(),
      role: 'USER'
    };
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return null;
  }
}

export default async function UserProfilePage({ params }: { params: { id: string } }) {
  const user = await getUser(params.id);

  if (!user) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <LandingNav />
      <main className="mx-auto max-w-5xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* User Info Sidebar */}
          <div className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-100">
                  <User className="h-12 w-12 text-slate-400" />
                </div>
                <h1 className="mt-4 text-xl font-bold text-slate-900">{user.name || 'Anonymous User'}</h1>
                <p className="text-sm text-slate-500">Member since {new Date(user.createdAt).getFullYear()}</p>

                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {user.isVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                      <ShieldCheck className="h-3 w-3" />
                      Verified
                    </span>
                  )}
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {user.role}
                  </span>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-6">
                {user.agentProfile && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-slate-900">About Agent</h3>
                    <p className="mt-1 text-sm text-slate-600">{user.agentProfile.bio || "No bio available."}</p>
                  </div>
                )}
                {user.landlordProfile && user.landlordProfile.companyName && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-slate-900">Company</h3>
                    <p className="mt-1 text-sm text-slate-600">{user.landlordProfile.companyName}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content: Reviews */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl bg-white p-8 shadow-sm">
              <h2 className="mb-6 text-xl font-bold text-slate-900">Ratings & Reviews</h2>
              <UserProfileReviews userId={user.id} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
