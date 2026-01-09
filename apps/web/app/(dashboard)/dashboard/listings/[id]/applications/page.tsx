import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { serverApiRequest } from '@/lib/server-api';
import { ApplicationStatusSelect } from '@/components/application-status-select';
import { Avatar, AvatarFallback, AvatarImage, Badge } from '@propad/ui';
import { Mail, Phone, Calendar } from 'lucide-react';
import Link from 'next/link';

interface Application {
    id: string;
    status: string;
    notes: string | null;
    createdAt: string;
    user: {
        id: string;
        name: string | null;
        email: string | null;
        phone: string | null;
        profilePhoto: string | null;
    };
}

export default async function PropertyApplicationsPage({ params }: { params: { id: string } }) {
    const session = await auth();
    if (!session) redirect('/auth/signin');

    let applications: Application[] = [];
    try {
        applications = await serverApiRequest<Application[]>(`/applications/property/${params.id}`);
    } catch (error) {
        console.error('Failed to fetch applications:', error);
        // If forbidden, likely not owner
        // redirect('/dashboard/listings'); // Or show error
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <Link href={`/dashboard/listings/${params.id}`} className="text-sm text-slate-500 hover:underline mb-1">
                        &larr; Back to Listing
                    </Link>
                    <h1 className="text-2xl font-bold tracking-tight">Applications</h1>
                    <p className="text-slate-500">Manage applications for this property.</p>
                </div>
            </div>

            <div className="rounded-md border bg-white">
                {applications.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        No applications received yet.
                    </div>
                ) : (
                    <div className="divide-y">
                        {applications.map((app) => (
                            <div key={app.id} className="p-6 flex flex-col md:flex-row gap-6">
                                <div className="flex-shrink-0">
                                    <Avatar className="h-16 w-16">
                                        <AvatarImage src={app.user.profilePhoto || undefined} />
                                        <AvatarFallback>{app.user.name?.[0] || 'U'}</AvatarFallback>
                                    </Avatar>
                                </div>
                                <div className="flex-1 space-y-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-semibold text-slate-900">{app.user.name || 'Anonymous User'}</h3>
                                            <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                                                {app.user.email && (
                                                    <span className="flex items-center gap-1">
                                                        <Mail className="h-3 w-3" /> {app.user.email}
                                                    </span>
                                                )}
                                                {app.user.phone && (
                                                    <span className="flex items-center gap-1">
                                                        <Phone className="h-3 w-3" /> {app.user.phone}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" /> {new Date(app.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        <ApplicationStatusSelect applicationId={app.id} currentStatus={app.status} />
                                    </div>

                                    {app.notes && (
                                        <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
                                            <span className="font-semibold block mb-1 text-slate-900">Note from applicant:</span>
                                            {app.notes}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
