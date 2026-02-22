'use client';

import { useQuery } from '@tanstack/react-query';

import Link from 'next/link';
import { Ban, Building2, Eye, PauseCircle, PlayCircle, Search, Settings, Trash2, Users } from 'lucide-react';
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
import { useSdkClient } from '@/hooks/use-sdk-client';
import { ClientState } from '@/components/client-state';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ConfirmActionDialog } from '@/components/confirm-action-dialog';

export default function AdminAgenciesPage() {
    const { sdk, status, message } = useSdkClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    const [editAgency, setEditAgency] = useState<any | null>(null);
    const [pendingAction, setPendingAction] = useState<{ type: 'pause' | 'ban' | 'delete'; agency: any } | null>(null);
    const queryClient = useQueryClient();
    const [createForm, setCreateForm] = useState({ name: '', ownerEmail: '' });
    const [editForm, setEditForm] = useState({ name: '', status: 'ACTIVE' });

    useEffect(() => {
        if (editAgency) {
            setEditForm({ name: editAgency.name ?? '', status: editAgency.status ?? 'ACTIVE' });
        }
    }, [editAgency]);

    const { data: agencies, isLoading, isError } = useQuery({
        queryKey: ['admin-agencies'],
        enabled: status === 'ready',
        queryFn: async () => {
            if (!sdk) {
                return [];
            }
            return sdk.admin.agencies.list();
        }
    });

    const filteredAgencies = agencies?.filter(agency => {
        const matchesSearch = agency.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = !statusFilter || agency.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const createMutation = useMutation({
        mutationFn: async () => {
            if (!sdk) throw new Error('SDK not ready');
            return sdk.admin.agencies.create({
                name: createForm.name,
                ownerEmail: createForm.ownerEmail || undefined
            });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['admin-agencies'] });
            setCreateOpen(false);
            setCreateForm({ name: '', ownerEmail: '' });
        }
    });

    const updateMutation = useMutation({
        mutationFn: async (payload: { id: string; data: any }) => {
            if (!sdk) throw new Error('SDK not ready');
            return sdk.admin.agencies.updateProfile(payload.id, payload.data);
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['admin-agencies'] });
            setEditAgency(null);
        }
    });

    const statusMutation = useMutation({
        mutationFn: async (payload: { id: string; status: string; reason?: string }) => {
            if (!sdk) throw new Error('SDK not ready');
            return sdk.admin.agencies.updateStatus(payload.id, { status: payload.status, reason: payload.reason });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['admin-agencies'] });
        }
    });

    if (status !== 'ready') {
        return <ClientState status={status} message={message} title="Agencies" />;
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
                <div className="flex flex-wrap items-center gap-2">
                    <Button className="gap-2" variant="outline" onClick={() => setCreateOpen(true)}>
                        <Building2 className="h-4 w-4" /> Create Company
                    </Button>
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
                    <CardTitle className="text-base flex flex-wrap items-center justify-between gap-3">
                        <span>All Companies</span>
                        <div className="flex flex-wrap gap-2">
                            {['ACTIVE', 'PAUSED', 'BANNED'].map(statusValue => (
                                <button
                                    key={statusValue}
                                    onClick={() => setStatusFilter(statusFilter === statusValue ? '' : statusValue)}
                                    className={`text-xs px-2 py-1 rounded-full border transition-colors ${statusFilter === statusValue
                                            ? 'bg-neutral-900 text-white border-neutral-900'
                                            : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                                        }`}
                                >
                                    {statusValue}
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
                                    <th className="px-6 py-3">Agency Name</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Trust Score</th>
                                    <th className="px-6 py-3">Verification</th>
                                    <th className="px-6 py-3">Members</th>
                                    <th className="px-6 py-3">Joined</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center text-neutral-500">
                                            Loading agencies…
                                        </td>
                                    </tr>
                                ) : isError ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center text-red-600">
                                            Unable to load agencies right now.
                                        </td>
                                    </tr>
                                ) : filteredAgencies?.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center text-neutral-500">
                                            No agencies found.
                                        </td>
                                    </tr>
                                ) : filteredAgencies?.map((agency) => {
                                    const agencyStatus = (agency.status || '').toString().toUpperCase();
                                    return (
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
                                        <td className="px-6 py-3">
                                            <div className="flex justify-end gap-2">
                                                <Button size="icon" variant="ghost" asChild>
                                                    <Link href={`/profiles/companies/${agency.id}`} aria-label="View company" title="View company">
                                                        <Eye className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                <Button size="icon" variant="ghost" aria-label="Edit company" title="Edit company" onClick={() => setEditAgency(agency)}>
                                                    <Settings className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" aria-label="Pause company" title="Pause company" onClick={() => setPendingAction({ type: 'pause', agency })}>
                                                    <PauseCircle className="h-4 w-4" />
                                                </Button>
                                                {agencyStatus !== 'ACTIVE' && (
                                                    <Button size="icon" variant="ghost" aria-label="Reactivate company" title="Reactivate company" onClick={() => statusMutation.mutate({ id: agency.id, status: 'ACTIVE' })}>
                                                        <PlayCircle className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                <Button size="icon" variant="ghost" aria-label="Ban company" title="Ban company" className="text-red-500" onClick={() => setPendingAction({ type: 'ban', agency })}>
                                                    <Ban className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" aria-label="Delete company" title="Delete company" className="text-red-500" onClick={() => setPendingAction({ type: 'delete', agency })}>
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
                        <DialogTitle>Create Company</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            placeholder="Company name"
                            value={createForm.name}
                            onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })}
                        />
                        <Input
                            placeholder="Owner email (optional)"
                            value={createForm.ownerEmail}
                            onChange={(event) => setCreateForm({ ...createForm, ownerEmail: event.target.value })}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
                        <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !createForm.name}>
                            {createMutation.isPending ? 'Creating...' : 'Create Company'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!editAgency} onOpenChange={(open) => !open && setEditAgency(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit Company</DialogTitle>
                    </DialogHeader>
                    {editAgency && (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Input
                                placeholder="Company name"
                                value={editForm.name}
                                onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
                            />
                            <select
                                className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                                value={editForm.status}
                                onChange={(event) => setEditForm({ ...editForm, status: event.target.value })}
                            >
                                {['ACTIVE', 'PAUSED', 'BANNED', 'SUSPENDED'].map((value) => (
                                    <option key={value} value={value}>{value}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditAgency(null)}>Cancel</Button>
                        <Button
                            onClick={() => {
                                if (!editAgency) return;
                                if (editForm.name && editForm.name !== editAgency.name) {
                                    updateMutation.mutate({ id: editAgency.id, data: { name: editForm.name } });
                                }
                                if (editForm.status && editForm.status !== editAgency.status) {
                                    statusMutation.mutate({ id: editAgency.id, status: editForm.status });
                                }
                            }}
                            disabled={updateMutation.isPending || statusMutation.isPending}
                        >
                            {updateMutation.isPending || statusMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmActionDialog
                open={!!pendingAction}
                title={pendingAction?.type === 'delete'
                    ? 'Remove company'
                    : pendingAction?.type === 'ban'
                        ? 'Ban company'
                        : 'Pause company'}
                description={pendingAction ? `This will ${pendingAction.type} ${pendingAction.agency.name}.` : undefined}
                confirmLabel={pendingAction?.type === 'delete' ? 'Remove' : 'Confirm'}
                destructive={pendingAction?.type !== 'pause'}
                onOpenChange={(open) => !open && setPendingAction(null)}
                onConfirm={(reason) => {
                    if (!pendingAction) return;
                    if (pendingAction.type === 'pause') {
                        statusMutation.mutate({ id: pendingAction.agency.id, status: 'PAUSED', reason });
                    } else if (pendingAction.type === 'ban') {
                        statusMutation.mutate({ id: pendingAction.agency.id, status: 'BANNED', reason });
                    } else {
                        statusMutation.mutate({ id: pendingAction.agency.id, status: 'BANNED', reason });
                    }
                    setPendingAction(null);
                }}
            />
        </div>
    );
}
