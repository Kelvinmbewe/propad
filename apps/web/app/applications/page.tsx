import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { LandingNav } from '@/components/landing-nav';
import { Badge } from '@propad/ui';
import { MapPin, Calendar, Building } from 'lucide-react';
import { getImageUrl } from '@/lib/image-url';
import { serverApiRequest } from '@/lib/server-api'; // Authenticated request
import Link from 'next/link';
import Image from 'next/image';

interface Application {
    id: string;
    status: string;
    createdAt: string;
    property: {
        id: string;
        title: string;
        price: string;
        currency: string;
        location: {
            city: { name: string };
            suburb: { name: string };
        };
        media: { url: string }[];
    };
}

// Since we are not using SDK on server component for now (unless using the getApplications wrapper),
// we use serverApiRequest helper which handles auth headers.
// Or we can use the SDK wrapper if we have one. We have useAuthenticatedSDK (client).
// For server components, we fetch directly via API.

async function getMyApplications() {
    try {
        // serverApiRequest automatically attaches session token if available via auth()
        return await serverApiRequest<Application[]>('/applications/my');
    } catch (e) {
        console.error(e);
        return [];
    }
}

export default async function MyApplicationsPage() {
    const session = await auth();
    if (!session) redirect('/auth/signin');

    const applications = await getMyApplications();

    return (
        <div className="min-h-screen bg-slate-50">
            <LandingNav />
            <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-8">My Applications</h1>

                {applications.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-slate-200">
                        <Building className="mx-auto h-12 w-12 text-slate-300" />
                        <h3 className="mt-2 text-sm font-semibold text-slate-900">No applications yet</h3>
                        <p className="mt-1 text-sm text-slate-500">Start exploring properties and apply to your dream home.</p>
                        <div className="mt-6">
                            <Link href="/search" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                                Browse Properties
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {applications.map((app) => (
                            <div key={app.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row">
                                <div className="w-full md:w-64 h-48 md:h-auto relative">
                                    <Image
                                        src={app.property.media?.[0]?.url || 'https://via.placeholder.com/300'}
                                        alt={app.property.title}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                <div className="p-6 flex-1 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <Link href={`/properties/${app.property.id}`} className="text-xl font-bold text-slate-900 hover:text-emerald-600 transition-colors">
                                                    {app.property.title}
                                                </Link>
                                                <p className="text-slate-500 flex items-center gap-1 mt-1 text-sm">
                                                    <MapPin className="h-3 w-3" />
                                                    {app.property.location?.suburb?.name}, {app.property.location?.city?.name}
                                                </p>
                                            </div>
                                            <Badge
                                                className={
                                                    app.status === 'APPROVED' ? 'bg-green-100 text-green-800 hover:bg-green-100' :
                                                        app.status === 'REJECTED' ? 'bg-red-100 text-red-800 hover:bg-red-100' :
                                                            'bg-blue-100 text-blue-800 hover:bg-blue-100'
                                                }
                                            >
                                                {app.status}
                                            </Badge>
                                        </div>
                                        <div className="mt-4">
                                            <p className="text-sm text-slate-600">Applied on {new Date(app.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="mt-6 flex justify-end">
                                        <Link href={`/properties/${app.property.id}`} className="text-sm font-medium text-emerald-600 hover:underline">
                                            View Property
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
