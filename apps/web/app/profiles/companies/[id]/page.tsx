import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Metadata } from 'next';
import { TrustBadgeStack } from '@/components/trust/TrustBadgeStack';
import { Star, MapPin, Building2, User } from 'lucide-react';

async function getAgencyProfile(id: string) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'}/api/profiles/companies/${id}`, {
        cache: 'no-store'
    });
    if (!res.ok) return null;
    return res.json();
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
    const profile = await getAgencyProfile(params.id);
    if (!profile) return { title: 'Agency Not Found | ProPad' };
    return {
        title: `${profile.name} - Verified Real Estate Agency | ProPad`,
        description: profile.bio || `View properties and agents from ${profile.name}.`,
    };
}

export default async function AgencyProfilePage({ params }: { params: { id: string } }) {
    const profile = await getAgencyProfile(params.id);

    if (!profile) return notFound();

    return (
        <div className="min-h-screen bg-slate-50 py-12">
            <div className="container mx-auto max-w-6xl px-4">
                {/* Header Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-8">
                    <div className="h-40 bg-slate-900 relative">
                        {/* Cover Image Placeholder */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    </div>
                    <div className="px-10 pb-10">
                        <div className="relative flex flex-col md:flex-row justify-between items-end -mt-16 mb-6 gap-6">
                            <div className="relative">
                                <div className="w-32 h-32 rounded-xl border-4 border-white bg-white shadow-lg flex items-center justify-center overflow-hidden">
                                    {profile.logo ? (
                                        <Image src={profile.logo} alt={profile.name} width={128} height={128} className="object-contain p-2" />
                                    ) : (
                                        <Building2 className="w-12 h-12 text-slate-300" />
                                    )}
                                </div>
                            </div>
                            <div className="mb-2 flex-1">
                                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                                    {profile.name}
                                    {profile.stats.verified && (
                                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100 uppercase tracking-wide">
                                            Verified Agency
                                        </span>
                                    )}
                                </h1>
                                <p className="text-slate-500 mt-2 flex items-center gap-6 text-sm font-medium">
                                    <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4" /> Real Estate Agency</span>
                                    <span className="flex items-center gap-1.5"><User className="w-4 h-4" /> {profile.stats.agentCount} Agents</span>
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button className="px-6 py-3 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition shadow-sm hover:shadow-md">
                                    Browse Listings
                                </button>
                                <button className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition">
                                    Contact Office
                                </button>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-12 gap-10">
                            <div className="md:col-span-8">
                                <div className="prose prose-sm max-w-none text-slate-600 mb-8">
                                    <p>{profile.bio || "No description provided."}</p>
                                </div>
                                <div className="mb-6">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Trust & Accreditation</h3>
                                    <TrustBadgeStack badges={profile.badges} size="md" />
                                </div>
                            </div>

                            <div className="md:col-span-4 space-y-4">
                                <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Company Trust</span>
                                        <span className="text-emerald-700 font-bold">{profile.stats.trustTier}</span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                        <div
                                            className="bg-emerald-500 h-full rounded-full"
                                            style={{ width: profile.stats.trustTier === 'Elite' ? '95%' : profile.stats.trustTier === 'Trusted' ? '80%' : '50%' }}
                                        ></div>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                                        This score is based on verified transactions, client reviews, and years of operation.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Agents List */}
                <div className="mb-12">
                    <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        Our Agents <span className="text-slate-400 text-lg font-normal">({profile.stats.agentCount})</span>
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {profile.agents?.map((agent: any) => (
                            <a href={`/profiles/users/${agent.id}`} key={agent.id} className="group block bg-white rounded-xl border border-slate-100 p-4 hover:shadow-md transition">
                                <div className="aspect-square rounded-lg bg-slate-100 mb-4 overflow-hidden relative">
                                    {agent.photo ? (
                                        <Image src={agent.photo} alt={agent.name} fill className="object-cover group-hover:scale-105 transition" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                            <User className="w-8 h-8" />
                                        </div>
                                    )}
                                </div>
                                <h3 className="font-bold text-slate-900 truncate">{agent.name}</h3>
                                <p className="text-xs text-slate-500">View Profile</p>
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
