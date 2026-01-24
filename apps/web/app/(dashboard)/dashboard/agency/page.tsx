'use client';

import { useSession } from 'next-auth/react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Button,
    Badge,
    Skeleton,
    Input,
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@propad/ui';
import { Users, Building, ShieldCheck, UserPlus, Ban, PauseCircle, PlayCircle, UserCog } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { getRequiredPublicApiBaseUrl } from '@/lib/api-base-url';
import { ConfirmActionDialog } from '@/components/confirm-action-dialog';
import { KycSubmissionPanel } from '@/components/kyc/kyc-submission-panel';
import { ProfilePhotoUploader } from '@/components/profile-photo-uploader';
import { useState } from 'react';

export default function AgencyDashboardPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const apiBaseUrl = getRequiredPublicApiBaseUrl();
    const queryClient = useQueryClient();
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteForm, setInviteForm] = useState({ email: '', role: 'AGENT' });
    const [pendingAction, setPendingAction] = useState<{ type: 'pause' | 'ban' | 'remove'; member: any } | null>(null);
    const [companyEditOpen, setCompanyEditOpen] = useState(false);
    const [companyForm, setCompanyForm] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        registrationNumber: '',
        directors: ''
    });

    const { data: agency, isLoading } = useQuery({
        queryKey: ['agency', 'my'],
        queryFn: async () => {
            const res = await fetch(`${apiBaseUrl}/agencies/my`, {
                headers: { Authorization: `Bearer ${session?.accessToken}` }
            });
            if (res.status === 404) return null;
            return res.json();
        }
    });

    const saveCompanyProfile = async () => {
        if (!session?.accessToken || !agency) return;
        const directorsJson = companyForm.directors
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean)
            .map(line => {
                const [name, idNumber] = line.split(' - ').map(part => part.trim());
                return { name, idNumber };
            });
        const payload = {
            name: companyForm.name || undefined,
            email: companyForm.email || undefined,
            phone: companyForm.phone || undefined,
            address: companyForm.address || undefined,
            registrationNumber: companyForm.registrationNumber || undefined,
            directorsJson: directorsJson.length > 0 ? directorsJson : undefined
        };
        await fetch(`${apiBaseUrl}/agencies/${agency.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.accessToken}`
            },
            body: JSON.stringify(payload)
        });
        await queryClient.invalidateQueries({ queryKey: ['agency', 'my'] });
        setCompanyEditOpen(false);
    };

    const inviteMutation = useMutation({
        mutationFn: async () => {
            if (!session?.accessToken || !agency) throw new Error('Missing session');
            const res = await fetch(`${apiBaseUrl}/agencies/${agency.id}/members`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.accessToken}`
                },
                body: JSON.stringify(inviteForm)
            });
            if (!res.ok) throw new Error('Failed to add member');
            return res.json();
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['agency', 'my'] });
            setInviteOpen(false);
            setInviteForm({ email: '', role: 'AGENT' });
        }
    });

    const memberStatusMutation = useMutation({
        mutationFn: async (payload: { memberId: string; action: 'PAUSE' | 'BAN' | 'ACTIVATE' | 'REMOVE'; reason?: string }) => {
            if (!session?.accessToken || !agency) throw new Error('Missing session');
            const endpoint = payload.action === 'REMOVE'
                ? `${apiBaseUrl}/agencies/${agency.id}/members/${payload.memberId}`
                : `${apiBaseUrl}/agencies/${agency.id}/members/${payload.memberId}/status`;
            const res = await fetch(endpoint, {
                method: payload.action === 'REMOVE' ? 'DELETE' : 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.accessToken}`
                },
                body: JSON.stringify(payload.action === 'REMOVE'
                    ? { reason: payload.reason }
                    : { action: payload.action, reason: payload.reason })
            });
            if (!res.ok) throw new Error('Failed to update member');
            return res.json();
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['agency', 'my'] });
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
                <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <CardTitle>Team Members</CardTitle>
                        <p className="text-xs text-neutral-500">Invite, pause, or ban agents directly from your company hub.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" className="gap-2" onClick={() => setInviteOpen(true)}>
                            <UserPlus className="h-4 w-4" /> Invite Agent
                        </Button>
                        <Button size="sm" className="gap-2" onClick={() => setInviteOpen(true)}>
                            <UserCog className="h-4 w-4" /> Add Existing Agent
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {agency.members?.map((m: any) => {
                            const memberStatus = m.isActive ? 'ACTIVE' : m.revokedAt ? 'BANNED' : 'PAUSED';
                            return (
                                <div key={m.id} className="flex flex-col gap-3 border-b pb-4 md:flex-row md:items-center md:justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center font-bold">
                                            {m.user?.name?.[0] || '?'}
                                        </div>
                                        <div>
                                            <p className="font-medium">{m.user?.name || 'Unknown'}</p>
                                            <p className="text-xs text-gray-500 capitalize">{m.role?.toLowerCase() || 'agent'}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge
                                            variant="outline"
                                            className={memberStatus === 'BANNED'
                                                ? 'border-red-200 bg-red-50 text-red-600'
                                                : memberStatus === 'PAUSED'
                                                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                                                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'}
                                        >
                                            {memberStatus}
                                        </Badge>
                                        <Button variant="outline" size="sm" className="gap-1" onClick={() => setPendingAction({ type: 'pause', member: m })}>
                                            <PauseCircle className="h-3.5 w-3.5" /> Pause
                                        </Button>
                                        {memberStatus !== 'ACTIVE' && (
                                            <Button variant="outline" size="sm" className="gap-1" onClick={() => memberStatusMutation.mutate({ memberId: m.userId, action: 'ACTIVATE' })}>
                                                <PlayCircle className="h-3.5 w-3.5" /> Reactivate
                                            </Button>
                                        )}
                                        <Button variant="outline" size="sm" className="gap-1 text-red-600 border-red-200" onClick={() => setPendingAction({ type: 'ban', member: m })}>
                                            <Ban className="h-3.5 w-3.5" /> Ban
                                        </Button>
                                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => setPendingAction({ type: 'remove', member: m })}>Remove</Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Company Logo</CardTitle>
                </CardHeader>
                <CardContent>
                    <ProfilePhotoUploader
                        endpoint={`/agencies/${agency.id}/logo`}
                        currentUrl={agency.logoUrl}
                        label="Company logo"
                        onUploaded={() => queryClient.invalidateQueries({ queryKey: ['agency', 'my'] })}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex items-center justify-between">
                    <CardTitle>Company Details</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => {
                        setCompanyForm({
                            name: agency.name ?? '',
                            email: agency.email ?? '',
                            phone: agency.phone ?? '',
                            address: agency.address ?? '',
                            registrationNumber: agency.registrationNumber ?? '',
                            directors: (agency.directorsJson ?? []).map((director: any) => `${director.name}${director.idNumber ? ` - ${director.idNumber}` : ''}`).join('\n')
                        });
                        setCompanyEditOpen(true);
                    }}>
                        Edit Company
                    </Button>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-neutral-500">Keep registration and director details up to date for KYC.</p>
                </CardContent>
            </Card>

            <KycSubmissionPanel
                ownerType="AGENCY"
                ownerId={agency.id}
                title="Company KYC"
                description="Provide company registration and director documents for verification."
                requestUpdateEndpoint={`/wallets/kyc/agency/${agency.id}/request-update`}
                documentSlots={[
                    {
                        key: 'cert-inc',
                        label: 'Certificate of Incorporation',
                        description: 'Official registration certificate.',
                        docType: 'CERT_OF_INC',
                        required: true
                    },
                    {
                        key: 'cr6',
                        label: 'CR6 (Directors Register)',
                        description: 'Formerly CR14 showing directors.',
                        docType: 'CR6'
                    },
                    {
                        key: 'cr5',
                        label: 'CR5 (Company Address)',
                        description: 'Formerly CR6 showing registered address.',
                        docType: 'CR5'
                    },
                    {
                        key: 'mem-articles',
                        label: 'Memorandum & Articles',
                        description: 'Company constitution documents.',
                        docType: 'MEM_ARTICLES'
                    },
                    {
                        key: 'director-ids',
                        label: 'Director IDs',
                        description: 'Upload director IDs or passports.',
                        docType: 'DIRECTOR_ID',
                        multiple: true
                    },
                    {
                        key: 'rea-cert',
                        label: 'Real Estate Certification',
                        description: 'Industry certification for your agency.',
                        docType: 'REA_CERT'
                    }
                ]}
                documentChecklist={[
                    {
                        title: 'Certificate of Incorporation',
                        description: 'Official registration certificate.'
                    },
                    {
                        title: 'CR6 (Directors Register)',
                        description: 'Formerly CR14 showing directors.'
                    },
                    {
                        title: 'CR5 (Company Address)',
                        description: 'Formerly CR6 showing registered address.'
                    },
                    {
                        title: 'Memorandum & Articles',
                        description: 'Company constitution documents.'
                    },
                    {
                        title: 'Real Estate Certification',
                        description: 'Industry certification for your agency.'
                    },
                    {
                        title: 'Director IDs',
                        description: 'IDs for all directors or signatories.'
                    }
                ]}
            />

            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Add Agent</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            placeholder="Agent email"
                            value={inviteForm.email}
                            onChange={(event) => setInviteForm({ ...inviteForm, email: event.target.value })}
                        />
                        <select
                            className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                            value={inviteForm.role}
                            onChange={(event) => setInviteForm({ ...inviteForm, role: event.target.value })}
                        >
                            {['OWNER', 'MANAGER', 'AGENT'].map((role) => (
                                <option key={role} value={role}>{role}</option>
                            ))}
                        </select>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setInviteOpen(false)}>Cancel</Button>
                        <Button onClick={() => inviteMutation.mutate()} disabled={inviteMutation.isPending || !inviteForm.email}>
                            {inviteMutation.isPending ? 'Adding...' : 'Add Agent'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={companyEditOpen} onOpenChange={setCompanyEditOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Edit Company Details</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            placeholder="Company name"
                            value={companyForm.name}
                            onChange={(event) => setCompanyForm({ ...companyForm, name: event.target.value })}
                            disabled={agency.kycStatus === 'VERIFIED'}
                        />
                        <Input
                            placeholder="Company email"
                            value={companyForm.email}
                            onChange={(event) => setCompanyForm({ ...companyForm, email: event.target.value })}
                        />
                        <Input
                            placeholder="Company phone"
                            value={companyForm.phone}
                            onChange={(event) => setCompanyForm({ ...companyForm, phone: event.target.value })}
                        />
                        <Input
                            placeholder="Registration number"
                            value={companyForm.registrationNumber}
                            onChange={(event) => setCompanyForm({ ...companyForm, registrationNumber: event.target.value })}
                            disabled={agency.kycStatus === 'VERIFIED'}
                        />
                        <Input
                            placeholder="Company address"
                            value={companyForm.address}
                            onChange={(event) => setCompanyForm({ ...companyForm, address: event.target.value })}
                            disabled={agency.kycStatus === 'VERIFIED'}
                        />
                        <textarea
                            placeholder="Directors (Name - ID per line)"
                            value={companyForm.directors}
                            onChange={(event) => setCompanyForm({ ...companyForm, directors: event.target.value })}
                            disabled={agency.kycStatus === 'VERIFIED'}
                            className="h-24 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setCompanyEditOpen(false)}>Cancel</Button>
                        <Button onClick={saveCompanyProfile} disabled={agency.kycStatus === 'VERIFIED'}>
                            Save company
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmActionDialog
                open={!!pendingAction}
                title={pendingAction?.type === 'remove'
                    ? 'Remove agent'
                    : pendingAction?.type === 'ban'
                        ? 'Ban agent'
                        : 'Pause agent'}
                description={pendingAction ? `This will ${pendingAction.type} ${pendingAction.member?.user?.name || 'agent'}.` : undefined}
                confirmLabel={pendingAction?.type === 'remove' ? 'Remove' : 'Confirm'}
                destructive={pendingAction?.type !== 'pause'}
                onOpenChange={(open) => !open && setPendingAction(null)}
                onConfirm={(reason) => {
                    if (!pendingAction) return;
                    if (pendingAction.type === 'pause') {
                        memberStatusMutation.mutate({ memberId: pendingAction.member.userId, action: 'PAUSE', reason });
                    } else if (pendingAction.type === 'ban') {
                        memberStatusMutation.mutate({ memberId: pendingAction.member.userId, action: 'BAN', reason });
                    } else {
                        memberStatusMutation.mutate({ memberId: pendingAction.member.userId, action: 'REMOVE', reason });
                    }
                    setPendingAction(null);
                }}
            />
        </div>
    );
}
