'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';
import { Loader2, Building2, Users, Search, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge, Input } from '@propad/ui';
import { useState } from 'react';

export default function AdminAgenciesPage() {
    const sdk = useAuthenticatedSDK();
    const [searchTerm, setSearchTerm] = useState('');

    const { data: agencies, isLoading } = useQuery({
        queryKey: ['admin-agencies'],
        enabled: !!sdk,
        queryFn: async () => sdk!.admin.agencies.list()
    });

    const filteredAgencies = agencies?.filter(agency =>
        agency.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!sdk || isLoading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-neutral-900">Agencies</h1>
                    <p className="text-sm text-neutral-600">
                        Registered real estate agencies and companies.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
                        <Input
                            placeholder="Search agencies..."
                            className="pl-9 w-[250px]"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </header>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">All Companies</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-medium">
                                <tr>
                                    <th className="px-6 py-3">Agency Name</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Trust Score</th>
                                    <th className="px-6 py-3">Verification</th>
                                    <th className="px-6 py-3">Members</th>
                                    <th className="px-6 py-3">Joined</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {filteredAgencies?.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-neutral-500">
                                            No agencies found.
                                        </td>
                                    </tr>
                                ) : filteredAgencies?.map((agency) => (
                                    <tr key={agency.id} className="hover:bg-neutral-50/50 transition-colors">
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded bg-neutral-100 flex items-center justify-center text-neutral-500">
                                                    <Building2 className="w-4 h-4" />
                                                </div>
                                                <span className="font-medium text-neutral-900">{agency.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <Badge variant={agency.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs font-normal">
                                                {agency.status}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-1.5 w-16 bg-neutral-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${agency.trustScore > 80 ? 'bg-green-500' : 'bg-blue-500'}`}
                                                        style={{ width: `${Math.min(agency.trustScore, 100)}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-mono text-neutral-600">{agency.trustScore}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-1.5 w-16 bg-neutral-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full bg-purple-500"
                                                        style={{ width: `${Math.min(agency.verificationScore, 100)}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-mono text-neutral-600">{agency.verificationScore}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-1 text-neutral-600">
                                                <Users className="w-3 h-3" />
                                                <span>{agency._count.members}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-neutral-500">
                                            {format(new Date(agency.createdAt), 'MMM d, yyyy')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
