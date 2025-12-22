
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { TrustBadgeStack } from '@/components/trust/TrustBadgeStack';
import { Star, MapPin, Calendar, CheckCircle2 } from 'lucide-react';
import { Metadata } from 'next';

async function getUserProfile(id: string) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'}/api/profiles/users/${id}`, {
        cache: 'no-store'
    });
    if (!res.ok) return null;
    return res.json();
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
    const profile = await getUserProfile(params.id);
    if (!profile) return { title: 'Landlord Not Found | ProPad' };
    return {
        title: `${profile.name} - Verified Landlord Profile | ProPad`,
        description: profile.bio || `View the verified profile of ${profile.name} on ProPad.`,
    };
}

export default async function LandlordProfilePage({ params }: { params: { id: string } }) {
    const profile = await getUserProfile(params.id);

    if (!profile) return notFound();

    return (
        <div className="min-h-screen bg-slate-50 py-12">
            <div className="container mx-auto max-w-5xl px-4">
                {/* Header Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-8">
                    <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700 relative">
                        <div className="absolute inset-0 bg-black/10"></div>
                    </div>
                    <div className="px-8 pb-8">
                        <div className="relative flex flex-col md:flex-row justify-between items-end -mt-12 mb-6 gap-4">
                            <div className="relative">
                                <div className="w-24 h-24 rounded-full border-4 border-white bg-slate-200 overflow-hidden relative shadow-md">
                                    {profile.profilePhoto ? (
                                        <Image src={profile.profilePhoto} alt={profile.name} fill className="object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400 text-2xl font-bold">
                                            {profile.name?.[0]}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="mb-1 flex-1">
                                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                                    {profile.name}
                                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider border border-slate-200">
                                        Landlord
                                    </span>
                                </h1>
                                <p className="text-slate-500 mt-1 flex items-center gap-4 text-sm font-medium">
                                    <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {profile.location || 'Zimbabwe'}</span>
                                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Joined {new Date(profile.stats.joinedAt).getFullYear()}</span>
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button className="px-5 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition shadow-sm">
                                    Contact Landlord
                                </button>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            <div className="md:col-span-2">
                                {profile.bio && (
                                    <p className="text-slate-600 text-sm leading-relaxed mb-6">
                                        {profile.bio}
                                    </p>
                                )}
                                <div className="mb-2">
                                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Trust & Verification</h3>
                                    <TrustBadgeStack badges={profile.badges} />
                                </div>
                            </div>

                            {/* Key Stats */}
                            <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                                <div className="space-y-4">
                                    <div>
                                        <div className="text-xs text-slate-500 uppercase font-medium mb-1">Trust Tier</div>
                                        <div className="text-lg font-bold text-blue-700 flex items-center gap-2">
                                            {profile.stats.trustTier}
                                            {profile.stats.trustTier === 'Elite' && <Star className="w-4 h-4 fill-current" />}
                                        </div>
                                    </div>
                                    <div className="h-px bg-slate-200"></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="text-xs text-slate-500 uppercase font-medium mb-1">Reviews</div>
                                            <div className="font-semibold text-slate-900">{profile.stats.reviewCount}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500 uppercase font-medium mb-1">Verified</div>
                                            <div className={`font-semibold ${profile.stats.verificationLevel === 'VERIFIED' ? 'text-blue-600' : 'text-slate-500'}`}>
                                                {profile.stats.verificationLevel}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Reviews Section */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900">Tenant Reviews</h2>
                        </div>

                        {profile.recentReviews?.length > 0 ? (
                            <div className="space-y-4">
                                {profile.recentReviews.map((review: any) => (
                                    <div key={review.id} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm transition hover:shadow-md">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                                                    {review.author[0]}
                                                </div>
                                                <div className="font-medium text-slate-900 text-sm">{review.author}</div>
                                            </div>
                                            <div className="text-xs text-slate-400">{new Date(review.date).toLocaleDateString()}</div>
                                        </div>
                                        <div className="flex text-amber-400 mb-2">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-slate-200'}`} />
                                            ))}
                                        </div>
                                        <p className="text-slate-600 text-sm leading-relaxed">{review.comment}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white p-8 rounded-xl border border-slate-100 text-center">
                                <div className="text-slate-400 mb-2">No reviews yet</div>
                                <p className="text-sm text-slate-500">This landlord hasn't received any public reviews yet.</p>
                            </div>
                        )}
                    </div>

                    {/* Sidebar / Listings Placeholder */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                            <h3 className="font-bold text-slate-900 mb-4">Properties for Rent</h3>
                            <p className="text-sm text-slate-500 italic">No active listings.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
