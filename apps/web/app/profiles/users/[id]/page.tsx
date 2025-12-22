
import { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
// import { Badge } from '@/components/ui/badge'; // Assuming shadcn
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

async function getUserProfile(id: string) {
    // In a real app, use an SDK or fetch wrapper with env var
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/profiles/users/${id}`, {
        next: { revalidate: 60 } // Cache for 60s
    });
    if (!res.ok) return null;
    return res.json();
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
    // const profile = await getUserProfile(params.id); // Optimized in real app to dedupe request
    return {
        title: `User Profile | ProPad`,
    };
}

export default async function UserProfilePage({ params }: { params: { id: string } }) {
    const profile = await getUserProfile(params.id);

    if (!profile) {
        notFound();
    }

    return (
        <div className="container mx-auto py-10">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-start gap-6">
                    <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-sm">
                        {profile.profilePhoto ? (
                            <Image src={profile.profilePhoto} alt={profile.name} fill className="object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl">
                                {profile.name?.[0]?.toUpperCase()}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2 flex-1">
                        <h1 className="text-3xl font-bold">{profile.name}</h1>
                        <div className="flex gap-2 flex-wrap">
                            {profile.roles?.map((r: any) => (
                                <span key={r.role} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                                    {r.role}
                                </span>
                            ))}
                            {profile.isVerified && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium flex items-center gap-1">
                                    Verified
                                </span>
                            )}
                        </div>

                        {profile.bio && <p className="text-gray-600 max-w-xl">{profile.bio}</p>}

                        <div className="pt-4 flex gap-8 text-sm text-gray-500">
                            <div>
                                <span className="font-semibold text-gray-900 block text-lg">{profile.trustScore}</span>
                                Trust Score
                            </div>
                            <div>
                                <span className="font-semibold text-gray-900 block text-lg">{profile._count.propertiesOwned}</span>
                                Verified Listings
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Tabs (Placeholder) */}
                <div className="border-t pt-8">
                    <h2 className="text-xl font-semibold mb-4">Listings</h2>
                    <p className="text-gray-500">No active listings to show (Placeholder).</p>
                </div>
            </div>
        </div>
    );
}
