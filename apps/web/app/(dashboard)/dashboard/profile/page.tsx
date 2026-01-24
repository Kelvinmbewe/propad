'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge, Button, Input } from '@propad/ui';
import { User, Shield, CreditCard, MapPin, CheckCircle2, LockKeyhole } from 'lucide-react';
import { format } from 'date-fns';
import { KycSubmissionPanel } from '@/components/kyc/kyc-submission-panel';
import { ProfilePhotoUploader } from '@/components/profile-photo-uploader';
import { getRequiredPublicApiBaseUrl } from '@/lib/api-base-url';

export default function ProfilePage() {
    const { data: session } = useSession();
    const user = session?.user;

    if (!user) return null;

    // Type assertion because we just added these fields to the backend SanitizedUser, 
    // but NextAuth types on client might naturally lag without full type re-generation/augmentation.
    // In a real app, we'd update types/next-auth.d.ts. 
    // For now, access them safely.
    const trustScore = (user as any).trustScore ?? 0;
    const role = (user as any).role ?? 'USER';
    const verificationScore = (user as any).verificationScore ?? 0;
    const isVerified = (user as any).isVerified ?? false;
    const kycStatus = (user as any).kycStatus || 'PENDING';
    const profilePhoto = (user as any).profilePhoto ?? null;
    const [mfaEnabled, setMfaEnabled] = useState<boolean>((user as any).mfaEnabled ?? false);
    const [mfaSecret, setMfaSecret] = useState<string | null>(null);
    const [mfaQrCode, setMfaQrCode] = useState<string | null>(null);
    const [mfaToken, setMfaToken] = useState('');
    const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
    const [mfaLoading, setMfaLoading] = useState(false);
    const apiBaseUrl = getRequiredPublicApiBaseUrl();

    const setupMfa = async () => {
        setMfaLoading(true);
        try {
            const res = await fetch(`${apiBaseUrl}/auth/mfa/setup`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${session?.accessToken}`
                }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || 'Failed to start MFA setup');
            setMfaSecret(data.secret ?? null);
            setMfaQrCode(data.qrCode ?? null);
        } finally {
            setMfaLoading(false);
        }
    };

    const verifyMfa = async () => {
        if (!mfaToken) return;
        setMfaLoading(true);
        try {
            const res = await fetch(`${apiBaseUrl}/auth/mfa/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.accessToken}`
                },
                body: JSON.stringify({ token: mfaToken })
            });
            if (!res.ok) throw new Error('Unable to verify MFA');
            setMfaEnabled(true);
            setMfaSecret(null);
            setMfaQrCode(null);
            setMfaToken('');
        } finally {
            setMfaLoading(false);
        }
    };

    const disableMfa = async () => {
        if (!mfaToken) return;
        setMfaLoading(true);
        try {
            const res = await fetch(`${apiBaseUrl}/auth/mfa/disable`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.accessToken}`
                },
                body: JSON.stringify({ token: mfaToken })
            });
            if (!res.ok) throw new Error('Unable to disable MFA');
            setMfaEnabled(false);
            setMfaToken('');
        } finally {
            setMfaLoading(false);
        }
    };

    const generateRecoveryCodes = async () => {
        setMfaLoading(true);
        try {
            const res = await fetch(`${apiBaseUrl}/auth/mfa/recovery-codes`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${session?.accessToken}`
                }
            });
            const data = await res.json();
            if (!res.ok) throw new Error('Unable to generate recovery codes');
            setRecoveryCodes(data.codes ?? []);
        } finally {
            setMfaLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-neutral-900">My Profile</h1>
                    <p className="text-sm text-neutral-600">
                        Manage your digital identity and trust levels.
                    </p>
                </div>
                {/* Placeholder Edit Button */}
                <Button variant="outline" size="sm" className="gap-2">
                    <User className="w-4 h-4" /> Edit Profile
                </Button>
            </header>

            <div className="grid gap-6 md:grid-cols-[320px_1fr]">
                {/* Identity Card */}
                <div className="space-y-6">
                    <Card className="overflow-hidden">
                        <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                        <CardHeader className="relative pt-0 pb-2">
                            <div className="absolute -top-12 left-6">
                                <div className="h-24 w-24 rounded-full border-4 border-white shadow-sm overflow-hidden bg-neutral-100 flex items-center justify-center">
                                    {profilePhoto ? (
                                        <img src={profilePhoto} alt={user.name || 'Profile'} className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="text-xl font-bold text-neutral-600">
                                            {user.name?.charAt(0) || 'U'}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="mt-14 space-y-1">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-xl font-bold text-neutral-900">{user.name}</h2>
                                    {isVerified && <CheckCircle2 className="w-5 h-5 text-blue-500 fill-blue-50" />}
                                </div>
                                <p className="text-sm text-neutral-500 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> Harare, Zimbabwe
                                </p>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4 border-t border-neutral-100 mt-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-neutral-500">Role</span>
                                <Badge variant="secondary" className="font-mono">{user.role}</Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-neutral-500">Member Since</span>
                                <span className="text-neutral-900">
                                    {/* Fallback date if createdAt is missing in session types properly */}
                                    Dec 2025
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-neutral-500">KYC Status</span>
                                <Badge variant={kycStatus === 'VERIFIED' ? 'default' : 'outline'} className={kycStatus === 'VERIFIED' ? 'bg-green-600' : 'text-amber-600 border-amber-200 bg-amber-50'}>
                                    {kycStatus}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Shield className="w-4 h-4 text-purple-500" />
                                Trust & Reputation
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm font-medium">
                                    <span>Trust Score</span>
                                    <span className={trustScore > 80 ? 'text-green-600' : 'text-neutral-600'}>{trustScore}/100</span>
                                </div>
                                <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${trustScore > 80 ? 'bg-green-500' : 'bg-blue-500'}`}
                                        style={{ width: `${trustScore}%` }}
                                    />
                                </div>
                                <p className="text-xs text-neutral-500">
                                    Based on verified ID, successful transactions, and community ratings.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm font-medium">
                                    <span>Verification Level</span>
                                    <span className="text-neutral-600">{verificationScore}/100</span>
                                </div>
                                <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-purple-500 transition-all"
                                        style={{ width: `${verificationScore}%` }}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content Area */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Account Overview</CardTitle>
                            <CardDescription>Your activity and verified credentials.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 sm:grid-cols-2">
                            <div className="p-4 rounded-lg border border-neutral-100 bg-neutral-50 flex flex-col gap-1">
                                <span className="text-sm text-neutral-500">Current Plan</span>
                                <span className="font-semibold text-lg flex items-center gap-2">
                                    Free Tier
                                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 ml-auto">Upgrade</Badge>
                                </span>
                            </div>
                            <div className="p-4 rounded-lg border border-neutral-100 bg-neutral-50 flex flex-col gap-1">
                                <span className="text-sm text-neutral-500">Wallet Balance</span>
                                <span className="font-semibold text-lg flex items-center gap-2">
                                    $0.00
                                    <CreditCard className="w-4 h-4 ml-auto text-neutral-400" />
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Profile Photo</CardTitle>
                            <CardDescription>Update your public avatar.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ProfilePhotoUploader endpoint="/profiles/me/photo" currentUrl={profilePhoto} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <LockKeyhole className="h-4 w-4 text-emerald-600" /> Multi-factor Authentication
                            </CardTitle>
                            <CardDescription>Secure your account with an authenticator app.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={mfaEnabled ? 'default' : 'outline'} className={mfaEnabled ? 'bg-emerald-600' : ''}>
                                    {mfaEnabled ? 'Enabled' : 'Disabled'}
                                </Badge>
                                <span className="text-xs text-neutral-500">
                                    Use a TOTP authenticator like Google Authenticator or Authy.
                                </span>
                            </div>
                            {!mfaEnabled && (
                                <Button variant="outline" onClick={setupMfa} disabled={mfaLoading}>
                                    {mfaLoading ? 'Preparing…' : 'Set up MFA'}
                                </Button>
                            )}
                            {mfaQrCode && (
                                <div className="space-y-3">
                                    <div className="rounded-md border border-neutral-200 bg-white p-3">
                                        <img src={mfaQrCode} alt="MFA QR" className="max-w-[180px]" />
                                    </div>
                                    <p className="text-xs text-neutral-500">Manual code: {mfaSecret}</p>
                                    <Input
                                        placeholder="Enter 6-digit code"
                                        value={mfaToken}
                                        onChange={(event) => setMfaToken(event.target.value)}
                                    />
                                    <Button onClick={verifyMfa} disabled={mfaLoading || !mfaToken}>
                                        {mfaLoading ? 'Verifying…' : 'Verify & Enable'}
                                    </Button>
                                </div>
                            )}
                            {mfaEnabled && (
                                <div className="space-y-3">
                                    <Input
                                        placeholder="Enter authenticator or recovery code"
                                        value={mfaToken}
                                        onChange={(event) => setMfaToken(event.target.value)}
                                    />
                                    <Button variant="outline" onClick={disableMfa} disabled={mfaLoading || !mfaToken}>
                                        {mfaLoading ? 'Disabling…' : 'Disable MFA'}
                                    </Button>
                                </div>
                            )}
                            {mfaEnabled && (
                                <div className="space-y-3">
                                    <Button variant="outline" onClick={generateRecoveryCodes} disabled={mfaLoading}>
                                        {mfaLoading ? 'Generating…' : 'Generate recovery codes'}
                                    </Button>
                                    {recoveryCodes.length > 0 && (
                                        <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-700">
                                            <p className="mb-2 font-semibold">Store these codes securely:</p>
                                            <div className="grid gap-2 sm:grid-cols-2">
                                                {recoveryCodes.map((code) => (
                                                    <span key={code} className="rounded-md bg-white px-2 py-1 font-mono">
                                                        {code}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <KycSubmissionPanel
                        ownerType="USER"
                        ownerId={user.id}
                        title="KYC Verification"
                        description="Submit identity documents to unlock higher limits and agency access."
                        documentChecklist={role === 'INDEPENDENT_AGENT'
                            ? [
                                {
                                    title: 'National ID or Passport',
                                    description: 'Government-issued ID with clear photo.'
                                },
                                {
                                    title: 'Real Estate Certificate',
                                    description: 'Upload your current estate agent certification.'
                                },
                                {
                                    title: 'Proof of Address',
                                    description: 'Utility bill or bank statement (3 months).' 
                                }
                            ]
                            : [
                                {
                                    title: 'National ID or Passport',
                                    description: 'Government-issued ID with clear photo.'
                                },
                                {
                                    title: 'Proof of Address',
                                    description: 'Utility bill or bank statement (3 months).' 
                                }
                            ]}
                    />

                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Activity</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-neutral-500 text-center py-8">
                                No recent login activity or transactions.
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
