'use client';

import { useQuery } from '@tanstack/react-query';

import { Search, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, Badge, Input } from '@propad/ui';
import { useState } from 'react';
import type { AdminUser } from '@propad/sdk';
import { useSdkClient } from '@/hooks/use-sdk-client';
import { ClientState } from '@/components/client-state';

export default function AdminUsersPage() {
    const { sdk, status, message } = useSdkClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('');

    const { data: users, isLoading, isError } = useQuery<AdminUser[]>({
        queryKey: ['admin-users', roleFilter],
        enabled: status === 'ready',
        queryFn: async () => {
            if (!sdk) {
                return [];
            }
            return sdk.admin.users.list({ role: roleFilter || undefined });
        }
    });

    const filteredUsers = users?.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (status !== 'ready') {
        return <ClientState status={status} message={message} title="User management" />;
    }

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-neutral-900">User Management</h1>
                    <p className="text-sm text-neutral-600">
                        View and manage all registered users across the platform.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
                        <Input
                            placeholder="Search users..."
                            className="pl-9 w-[250px]"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </header>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                        <span>All Users</span>
                        <div className="flex gap-2">
                            {['ADMIN', 'AGENT', 'LANDLORD', 'USER'].map(role => (
                                <button
                                    key={role}
                                    onClick={() => setRoleFilter(roleFilter === role ? '' : role)}
                                    className={`text-xs px-2 py-1 rounded-full border transition-colors ${roleFilter === role
                                            ? 'bg-neutral-900 text-white border-neutral-900'
                                            : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                                        }`}
                                >
                                    {role}
                                </button>
                            ))}
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-medium">
                                <tr>
                                    <th className="px-6 py-3">User</th>
                                    <th className="px-6 py-3">Role</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Trust Score</th>
                                    <th className="px-6 py-3">Joined</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                                            Loading users…
                                        </td>
                                    </tr>
                                ) : isError ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-red-600">
                                            Unable to load users right now.
                                        </td>
                                    </tr>
                                ) : filteredUsers?.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                                            No users found matching your criteria.
                                        </td>
                                    </tr>
                                ) : filteredUsers?.map((user) => (
                                    <tr key={user.id} className="hover:bg-neutral-50/50 transition-colors group">
                                        <td className="px-6 py-3">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-neutral-900">{user.name || 'Unnamed User'}</span>
                                                <span className="text-xs text-neutral-500">{user.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <Badge variant="outline" className="text-xs font-normal">
                                                {user.role}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-2">
                                                {user.isVerified ? (
                                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 gap-1 pl-1 pr-2">
                                                        <UserCheck className="w-3 h-3" /> Verified
                                                    </Badge>
                                                ) : (
                                                    <span className="text-neutral-400 text-xs">Unverified</span>
                                                )}
                                                {user.kycStatus === 'PENDING' && (
                                                    <Badge variant="secondary" className="bg-amber-100 text-amber-700">KYC Pending</Badge>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-1.5 w-16 bg-neutral-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${user.trustScore > 80 ? 'bg-green-500' : user.trustScore > 50 ? 'bg-blue-500' : 'bg-neutral-300'}`}
                                                        style={{ width: `${Math.min(user.trustScore, 100)}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-mono text-neutral-600">{user.trustScore}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-neutral-500">
                                            {format(new Date(user.createdAt), 'MMM d, yyyy')}
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
