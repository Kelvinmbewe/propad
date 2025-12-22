
import { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';

async function getCompanyProfile(slug: string) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/profiles/companies/${slug}`, {
        next: { revalidate: 60 }
    });
    if (!res.ok) return null;
    return res.json();
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
    return {
        title: `Company Profile | ProPad`,
    };
}

export default async function CompanyProfilePage({ params }: { params: { slug: string } }) {
    const company = await getCompanyProfile(params.slug);

    if (!company) {
        notFound();
    }

    return (
        <div className="container mx-auto py-10">
            {/* Banner / Header */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="h-32 bg-gray-50"></div> {/* Banner Placeholder */}
                <div className="px-8 pb-8">
                    <div className="relative -mt-12 mb-6 flex justify-between items-end">
                        <div className="w-24 h-24 bg-white rounded-lg shadow-md p-1 border">
                            {company.logoUrl ? (
                                <div className="relative w-full h-full">
                                    <Image src={company.logoUrl} alt={company.name} fill className="object-contain rounded" />
                                </div>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded text-gray-400 font-bold text-xl">
                                    {company.name?.[0]}
                                </div>
                            )}
                        </div>
                        <div className="mb-1">
                            {company.verifiedAt && (
                                <span className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium">Verified Agency</span>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <h1 className="text-3xl font-bold">{company.name}</h1>
                            {company.registrationNumber && (
                                <p className="text-sm text-gray-500">Reg: {company.registrationNumber}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="md:col-span-2 space-y-6">
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-2">About</h3>
                                    <p className="text-gray-600 leading-relaxed">
                                        {company.bio || `No bio available for ${company.name}.`}
                                    </p>
                                </div>

                                {/* Agents List */}
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-4">Our Agents</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {company.members?.map((m: any) => (
                                            <div key={m.user.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                                                <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden relative">
                                                    {m.user.profilePhoto && <Image src={m.user.profilePhoto} alt="" fill className="object-cover" />}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-sm">{m.user.name}</div>
                                                    <div className="text-xs text-gray-500">{m.role}</div>
                                                </div>
                                            </div>
                                        ))}
                                        {(!company.members || company.members.length === 0) && (
                                            <p className="text-gray-500 text-sm">No public agents listed.</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-6 rounded-lg h-fit space-y-6">
                                <div>
                                    <div className="text-sm text-gray-500 mb-1">Trust Score</div>
                                    <div className="text-3xl font-bold text-gray-900">{company.trustScore}</div>
                                </div>

                                <div className="pt-4 border-t border-gray-200">
                                    <h4 className="font-medium mb-3">Contact</h4>
                                    <div className="space-y-2 text-sm">
                                        {company.email && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Email</span>
                                                <span className="font-medium truncate max-w-[150px]">{company.email}</span>
                                            </div>
                                        )}
                                        {company.address && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Address</span>
                                                <span className="font-medium text-right">{company.address}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
