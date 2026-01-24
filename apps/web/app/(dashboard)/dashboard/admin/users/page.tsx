'use client';

import { useQuery } from '@tanstack/react-query';

import Link from 'next/link';
import { Ban, Eye, PauseCircle, PlayCircle, Search, UserCheck, UserCog, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Badge,
    Input,
    Button,
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@propad/ui';
import { useEffect, useState } from 'react';
import type { AdminUser } from '@propad/sdk';
import { useSdkClient } from '@/hooks/use-sdk-client';
import { ClientState } from '@/components/client-state';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ConfirmActionDialog } from '@/components/confirm-action-dialog';

export default function AdminUsersPage() {
    const { sdk, status, message } = useSdkClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('');
    const [createOpen, setCreateOpen] = useState(false);
    const [editUser, setEditUser] = useState<AdminUser | null>(null);
    const [pendingAction, setPendingAction] = useState<{ type: 'pause' | 'ban' | 'delete'; user: AdminUser } | null>(null);
    const queryClient = useQueryClient();

    const [newUser, setNewUser] = useState({
        email: '',
        name: '',
        role: 'USER',
        password: '',
        status: 'ACTIVE'
    });

    const [editForm, setEditForm] = useState({
        email: '',
        name: '',
        role: 'USER',
        status: 'ACTIVE',
        password: ''
    });

    useEffect(() => {
        if (editUser) {
            setEditForm({
                email: editUser.email ?? '',
                name: editUser.name ?? '',
                role: editUser.role ?? 'USER',
                status: (editUser as any)?.status ?? 'ACTIVE',
                password: ''
            });
        }
    }, [editUser]);

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

    const createMutation = useMutation({
        mutationFn: async () => {
            if (!sdk) throw new Error('SDK not ready');
            return sdk.admin.users.create({
                email: newUser.email,
                name: newUser.name || undefined,
                role: newUser.role || undefined,
                password: newUser.password,
                status: newUser.status || undefined
            });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            setCreateOpen(false);
            setNewUser({ email: '', name: '', role: 'USER', password: '', status: 'ACTIVE' });
        }
    });

    const updateMutation = useMutation({
        mutationFn: async (payload: { id: string; data: { email?: string; name?: string; role?: string; status?: string; password?: string } }) => {
            if (!sdk) throw new Error('SDK not ready');
            return sdk.admin.users.update(payload.id, payload.data);
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            setEditUser(null);
        }
    });

    const statusMutation = useMutation({
        mutationFn: async (payload: { id: string; status: string; reason?: string }) => {
            if (!sdk) throw new Error('SDK not ready');
            return sdk.admin.users.updateStatus(payload.id, { status: payload.status, reason: payload.reason });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (payload: { id: string; reason?: string }) => {
            if (!sdk) throw new Error('SDK not ready');
            return sdk.admin.users.remove(payload.id, { reason: payload.reason });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        }
    });

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
                <div className="flex flex-wrap items-center gap-2">
                    <Button className="gap-2" variant="outline" onClick={() => setCreateOpen(true)}>
                        <UserCog className="h-4 w-4" /> Create User
                    </Button>
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
                                    <th className="px-6 py-3">Account</th>
                                    <th className="px-6 py-3">Compliance</th>
                                    <th className="px-6 py-3">Trust Score</th>
                                    <th className="px-6 py-3">Joined</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center text-neutral-500">
                                            Loading users…
                                        </td>
                                    </tr>
                                ) : isError ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center text-red-600">
                                            Unable to load users right now.
                                        </td>
                                    </tr>
                                ) : filteredUsers?.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center text-neutral-500">
                                            No users found matching your criteria.
                                        </td>
                                    </tr>
                                ) : filteredUsers?.map((user) => {
                                    const accountStatus = (user.status || '').toString().toUpperCase();
                                    return (
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
                                            <Badge
                                                variant="outline"
                                                className={`${(() => {
                                                    const accountState = (user.status || '').toString().toUpperCase();
                                                    if (accountState === 'BANNED') return 'bg-red-100 text-red-700 border-red-200';
                                                    if (accountState === 'PAUSED' || accountState === 'SUSPENDED') return 'bg-amber-100 text-amber-700 border-amber-200';
                                                    if (user.isVerified) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
                                                    return 'bg-neutral-100 text-neutral-600 border-neutral-200';
                                                })()}`}
                                            >
                                                {(user.status || (user.isVerified ? 'ACTIVE' : 'REVIEW')).toString()}
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
                                                {user.kycStatus && (
                                                    <Badge
                                                        variant="secondary"
                                                        className={user.kycStatus === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-neutral-100 text-neutral-600'}
                                                    >
                                                        KYC {user.kycStatus.toLowerCase()}
                                                    </Badge>
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
                                        <td className="px-6 py-3">
                                            <div className="flex justify-end gap-2">
                                                <Button size="icon" variant="ghost" asChild>
                                                    <Link href={`/profiles/users/${user.id}`} aria-label="View profile" title="View profile">
                                                        <Eye className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                <Button size="icon" variant="ghost" aria-label="Edit user" title="Edit user" onClick={() => setEditUser(user)}>
                                                    <UserCog className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" aria-label="Pause user" title="Pause user" onClick={() => setPendingAction({ type: 'pause', user })}>
                                                    <PauseCircle className="h-4 w-4" />
                                                </Button>
                                                {accountStatus !== 'ACTIVE' && (
                                                    <Button size="icon" variant="ghost" aria-label="Reactivate user" title="Reactivate user" onClick={() => statusMutation.mutate({ id: user.id, status: 'ACTIVE' })}>
                                                        <PlayCircle className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                <Button size="icon" variant="ghost" aria-label="Ban user" title="Ban user" className="text-red-500" onClick={() => setPendingAction({ type: 'ban', user })}>
                                                    <Ban className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" aria-label="Archive user" title="Archive user" className="text-red-500" onClick={() => setPendingAction({ type: 'delete', user })}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Create User</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            placeholder="Full name"
                            value={newUser.name}
                            onChange={(event) => setNewUser({ ...newUser, name: event.target.value })}
                        />
                        <Input
                            placeholder="Email address"
                            value={newUser.email}
                            onChange={(event) => setNewUser({ ...newUser, email: event.target.value })}
                        />
                        <Input
                            placeholder="Temporary password"
                            type="password"
                            value={newUser.password}
                            onChange={(event) => setNewUser({ ...newUser, password: event.target.value })}
                        />
                        <select
                            className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                            value={newUser.role}
                            onChange={(event) => setNewUser({ ...newUser, role: event.target.value })}
                        >
                            {['ADMIN', 'AGENT', 'LANDLORD', 'USER', 'MODERATOR'].map(role => (
                                <option key={role} value={role}>{role}</option>
                            ))}
                        </select>
                        <select
                            className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                            value={newUser.status}
                            onChange={(event) => setNewUser({ ...newUser, status: event.target.value })}
                        >
                            {['ACTIVE', 'PAUSED', 'BANNED'].map(value => (
                                <option key={value} value={value}>{value}</option>
                            ))}
                        </select>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
                        <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !newUser.email || !newUser.password}>
                            {createMutation.isPending ? 'Creating...' : 'Create User'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                    </DialogHeader>
                    {editUser && (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Input
                                placeholder="Full name"
                                value={editForm.name}
                                onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
                            />
                            <Input
                                placeholder="Email address"
                                value={editForm.email}
                                onChange={(event) => setEditForm({ ...editForm, email: event.target.value })}
                            />
                            <select
                                className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                                value={editForm.role}
                                onChange={(event) => setEditForm({ ...editForm, role: event.target.value })}
                            >
                                {['ADMIN', 'AGENT', 'LANDLORD', 'USER', 'MODERATOR'].map(role => (
                                    <option key={role} value={role}>{role}</option>
                                ))}
                            </select>
                            <select
                                className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                                value={editForm.status}
                                onChange={(event) => setEditForm({ ...editForm, status: event.target.value })}
                            >
                                {['ACTIVE', 'PAUSED', 'BANNED'].map(value => (
                                    <option key={value} value={value}>{value}</option>
                                ))}
                            </select>
                            <Input
                                placeholder="Reset password (optional)"
                                type="password"
                                value={editForm.password}
                                onChange={(event) => setEditForm({ ...editForm, password: event.target.value })}
                            />
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditUser(null)}>Cancel</Button>
                        <Button
                            onClick={() => editUser && updateMutation.mutate({
                                id: editUser.id,
                                data: {
                                    email: editForm.email || undefined,
                                    name: editForm.name || undefined,
                                    role: editForm.role || undefined,
                                    status: editForm.status || undefined,
                                    password: editForm.password || undefined
                                }
                            })}
                            disabled={updateMutation.isPending}
                        >
                            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmActionDialog
                open={!!pendingAction}
                title={pendingAction?.type === 'delete'
                    ? 'Archive user'
                    : pendingAction?.type === 'ban'
                        ? 'Ban user'
                        : 'Pause user'}
                description={pendingAction ? `This will ${pendingAction.type === 'delete' ? 'archive' : pendingAction.type} ${pendingAction.user.name || pendingAction.user.email}.` : undefined}
                confirmLabel={pendingAction?.type === 'delete' ? 'Archive' : 'Confirm'}
                destructive={pendingAction?.type !== 'pause'}
                onOpenChange={(open) => !open && setPendingAction(null)}
                onConfirm={(reason) => {
                    if (!pendingAction) return;
                    if (pendingAction.type === 'pause') {
                        statusMutation.mutate({ id: pendingAction.user.id, status: 'PAUSED', reason });
                    } else if (pendingAction.type === 'ban') {
                        statusMutation.mutate({ id: pendingAction.user.id, status: 'BANNED', reason });
                    } else {
                        deleteMutation.mutate({ id: pendingAction.user.id, reason });
                    }
                    setPendingAction(null);
                }}
            />
        </div>
    );
}
