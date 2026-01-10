'use client';

import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Skeleton } from '@propad/ui';
import { Users, Building, ShieldCheck, UserPlus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

export default function AgencyDashboardPage() {
    const sdk = useAuthenticatedSDK();
    const { data: session } = useSession();
    const router = useRouter();

    const { data: agency, isLoading } = useQuery({
        queryKey: ['agency', 'my'],
        queryFn: async () => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/agencies/my`, {
                headers: { Authorization: `Bearer ${session?.accessToken}` }
            });
            if (res.status === 404) return null;
            return res.json();
        }
    });

    if (isLoading) return <Skeleton className="h-96 w-full" />;

    if (!agency) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold">No Agency Found</h2>
                <p className="text-gray-500 mb-4">You are not a member of any agency.</p>
                <Button onClick={() => router.push('/dashboard/agency/create')}>Register Agency</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{agency.name}</h1>
                    <p className="text-sm text-neutral-500">Agency Dashboard</p>
                </div>
                <Badge variant={agency.status === 'ACTIVE' ? 'default' : 'secondary'}>{agency.status}</Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" /> Members
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{agency.members?.length || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building className="h-5 w-5" /> Listings
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{agency.properties?.length || 0}</div>
                        <p className="text-xs text-gray-500">Active Listings</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5" /> Trust Score
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-600">{agency.trustScore || 0}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Team Members</CardTitle>
                    <Button size="sm" variant="outline">
                        <UserPlus className="h-4 w-4 mr-2" /> Invite
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {agency.members?.map((m: any) => (
                            <div key={m.id} className="flex justify-between items-center border-b pb-2">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center font-bold">
                                        {m.user.name?.[0] || '?'}
                                    </div>
                                    <div>
                                        <p className="font-medium">{m.user.name || 'Unknown'}</p>
                                        <p className="text-xs text-gray-500 capitalize">{m.role.toLowerCase()}</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" className="text-red-500">Remove</Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
