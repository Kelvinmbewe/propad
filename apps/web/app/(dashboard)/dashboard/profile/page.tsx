'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge, Button, Input, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, notify } from '@propad/ui';
import { User, Shield, CreditCard, MapPin, CheckCircle2, LockKeyhole, Search, Plus, X } from 'lucide-react';
import { KycSubmissionPanel } from '@/components/kyc/kyc-submission-panel';
import { ProfilePhotoUploader } from '@/components/profile-photo-uploader';
import { getRequiredPublicApiBaseUrl } from '@/lib/api-base-url';
import { getImageUrl } from '@/lib/image-url';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';
import type { GeoSearchResult } from '@propad/sdk';

export default function ProfilePage() {
    const { data: session } = useSession();
    const apiBaseUrl = getRequiredPublicApiBaseUrl();
    const sdk = useAuthenticatedSDK();
    const queryClient = useQueryClient();
    const { data: profileData } = useQuery({
        queryKey: ['profile', 'me'],
        enabled: !!session?.accessToken,
        queryFn: async () => {
            const res = await fetch(`${apiBaseUrl}/profiles/me`, {
                headers: { Authorization: `Bearer ${session?.accessToken}` }
            });
            if (!res.ok) throw new Error('Failed to load profile');
            return res.json();
        }
    });

    const user = profileData || session?.user;

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
    const [profilePhoto, setProfilePhoto] = useState<string | null>((user as any).profilePhoto ?? null);
    const [mfaEnabled, setMfaEnabled] = useState<boolean>((user as any).mfaEnabled ?? false);
    const [mfaSecret, setMfaSecret] = useState<string | null>(null);
    const [mfaQrCode, setMfaQrCode] = useState<string | null>(null);
    const [mfaToken, setMfaToken] = useState('');
    const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
    const [mfaLoading, setMfaLoading] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [profileForm, setProfileForm] = useState({
        name: user.name ?? '',
        phone: (user as any).phone ?? '',
        dateOfBirth: (user as any).dateOfBirth ? new Date((user as any).dateOfBirth).toISOString().slice(0, 10) : '',
        idNumber: (user as any).idNumber ?? '',
        addressLine1: (user as any).addressLine1 ?? '',
        addressCity: (user as any).addressCity ?? '',
        addressProvince: (user as any).addressProvince ?? '',
        addressCountry: (user as any).addressCountry ?? '',
        location: (user as any).location ?? ''
    });

    const [geoQuery, setGeoQuery] = useState('');
    const [geoResults, setGeoResults] = useState<GeoSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [locationLabel, setLocationLabel] = useState('');
    const [showNewLocationForm, setShowNewLocationForm] = useState(false);
    const [newSuburbName, setNewSuburbName] = useState('');
    const [selectedCity, setSelectedCity] = useState<GeoSearchResult | null>(null);
    const [citySearchQuery, setCitySearchQuery] = useState('');
    const [cityResults, setCityResults] = useState<GeoSearchResult[]>([]);
    const [showCityDropdown, setShowCityDropdown] = useState(false);
    const [isSearchingCity, setIsSearchingCity] = useState(false);
    const [isCreatingPending, setIsCreatingPending] = useState(false);

    useEffect(() => {
        if (!profileData) return;
        setProfilePhoto((profileData as any).profilePhoto ?? null);
        setProfileForm({
            name: profileData.name ?? '',
            phone: profileData.phone ?? '',
            dateOfBirth: profileData.dateOfBirth ? new Date(profileData.dateOfBirth).toISOString().slice(0, 10) : '',
            idNumber: profileData.idNumber ?? '',
            addressLine1: profileData.addressLine1 ?? '',
            addressCity: profileData.addressCity ?? '',
            addressProvince: profileData.addressProvince ?? '',
            addressCountry: profileData.addressCountry ?? '',
            location: (profileData as any).location ?? ''
        });
        const nextLabel = [
            profileData.addressCity,
            profileData.addressProvince,
            profileData.addressCountry
        ]
            .filter(Boolean)
            .join(', ');
        if (nextLabel) {
            setLocationLabel(nextLabel);
        } else if ((profileData as any).location) {
            setLocationLabel((profileData as any).location);
        }
    }, [profileData]);

    const { data: kycHistory } = useQuery({
        queryKey: ['kyc-history', 'me'],
        enabled: !!session?.accessToken,
        queryFn: async () => {
            const res = await fetch(`${apiBaseUrl}/wallets/kyc/history`, {
                headers: { Authorization: `Bearer ${session?.accessToken}` }
            });
            if (!res.ok) return [];
            return res.json();
        }
    });
    const passportExpiry = kycHistory?.find((record: any) => record.idType === 'PASSPORT')?.idExpiryDate;
    const passportExpiringSoon = passportExpiry
        ? new Date(passportExpiry).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 30
        : false;

    const profileLocation = useMemo(() => {
        const source = profileData || (user as any);
        const fallback = [
            source?.addressCity,
            source?.addressProvince,
            source?.addressCountry
        ]
            .filter(Boolean)
            .join(', ');
        return source?.location || fallback || 'Location not set';
    }, [profileData, user]);

    const profileComplete = useMemo(() => {
        const source = profileData || (user as any);
        const hasIdentity = Boolean(
            source?.name &&
            source?.phone &&
            source?.dateOfBirth &&
            source?.idNumber
        );
        const hasAddress = Boolean(
            source?.addressLine1 &&
            source?.addressCity &&
            source?.addressCountry
        );
        const hasLocation = Boolean(source?.location);
        return hasIdentity && (hasAddress || hasLocation);
    }, [profileData, user]);

    const profilePhotoUrl = profilePhoto ? getImageUrl(profilePhoto) : null;

    useEffect(() => {
        if (!sdk || geoQuery.length < 2) {
            setGeoResults([]);
            setShowDropdown(false);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const results = await sdk.geo.search(geoQuery);
                setGeoResults(results);
                setShowDropdown(results.length > 0);
            } catch (error) {
                console.error('Geo search failed:', error);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [geoQuery, sdk]);

    useEffect(() => {
        if (!sdk || citySearchQuery.length < 2) {
            setCityResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearchingCity(true);
            try {
                const results = await sdk.geo.search(citySearchQuery);
                setCityResults(results.filter(result => result.level === 'CITY'));
                setShowCityDropdown(true);
            } catch (error) {
                console.error('City search failed:', error);
            } finally {
                setIsSearchingCity(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [citySearchQuery, sdk]);

    const formatLocationDisplay = (result: GeoSearchResult) => {
        if (result.level === 'SUBURB' && result.cityName) {
            return `${result.name}, ${result.cityName}`;
        }
        if (result.level === 'CITY' && result.provinceName) {
            return `${result.name} (${result.provinceName})`;
        }
        return result.name;
    };

    const handleLocationSelect = (result: GeoSearchResult) => {
        const displayName = formatLocationDisplay(result);
        setLocationLabel(displayName);
        setGeoQuery('');
        setShowDropdown(false);
        setShowNewLocationForm(false);

        if (result.level === 'COUNTRY') {
            setProfileForm((current) => ({
                ...current,
                addressCountry: result.name,
                addressProvince: '',
                addressCity: '',
                location: result.name
            }));
            return;
        }

        if (result.level === 'PROVINCE') {
            const countryName = (result as any).countryName as string | undefined;
            setProfileForm((current) => ({
                ...current,
                addressCountry: countryName ?? current.addressCountry,
                addressProvince: result.name,
                addressCity: '',
                location: displayName
            }));
            return;
        }

        if (result.level === 'CITY') {
            const countryName = (result as any).countryName as string | undefined;
            setProfileForm((current) => ({
                ...current,
                addressCountry: countryName ?? current.addressCountry,
                addressProvince: result.provinceName ?? current.addressProvince,
                addressCity: result.name,
                location: displayName
            }));
            return;
        }

        if (result.level === 'SUBURB') {
            const countryName = (result as any).countryName as string | undefined;
            setProfileForm((current) => ({
                ...current,
                addressCountry: countryName ?? current.addressCountry,
                addressProvince: result.provinceName ?? current.addressProvince,
                addressCity: result.cityName ?? current.addressCity,
                location: displayName
            }));
        }
    };

    const handleCreateNewSuburb = async () => {
        if (!sdk || !newSuburbName.trim() || !selectedCity) {
            notify.error('Please enter a suburb name and select a city.');
            return;
        }

        setIsCreatingPending(true);
        try {
            await sdk.geo.createPending({
                level: 'SUBURB',
                proposedName: newSuburbName.trim(),
                parentId: selectedCity.id
            });

            const displayName = `${newSuburbName.trim()}, ${selectedCity.name} (pending approval)`;
            const countryName = (selectedCity as any).countryName as string | undefined;
            setLocationLabel(displayName);
            setProfileForm((current) => ({
                ...current,
                addressCountry: countryName ?? current.addressCountry,
                addressProvince: selectedCity.provinceName ?? current.addressProvince,
                addressCity: selectedCity.name,
                location: displayName
            }));

            notify.success('New location submitted for approval');
            setShowNewLocationForm(false);
            setNewSuburbName('');
            setSelectedCity(null);
            setCitySearchQuery('');
            setShowCityDropdown(false);
            setShowDropdown(false);
        } catch (error) {
            console.error('Failed to create pending geo:', error);
            notify.error('Failed to submit new location');
        } finally {
            setIsCreatingPending(false);
        }
    };

    const clearLocation = () => {
        setLocationLabel('');
        setGeoQuery('');
        setProfileForm((current) => ({
            ...current,
            addressCity: '',
            addressProvince: '',
            addressCountry: '',
            location: ''
        }));
    };

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
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditOpen(true)}>
                    <User className="w-4 h-4" /> Edit Profile
                </Button>
            </header>

            {passportExpiringSoon && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    Your passport verification is expiring soon. Request a KYC update and upload a renewed passport.
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-[320px_1fr]">
                {/* Identity Card */}
                <div className="space-y-6">
                    <Card className="overflow-hidden">
                        <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                        <CardHeader className="relative pt-0 pb-2">
                            <div className="absolute -top-12 left-6">
                                <div className="h-24 w-24 rounded-full border-4 border-white shadow-sm overflow-hidden bg-neutral-100 flex items-center justify-center">
                                    {profilePhotoUrl ? (
                                        <img src={profilePhotoUrl} alt={user.name || 'Profile'} className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="text-xl font-bold text-neutral-600">
                                            {user.name?.charAt(0) || 'U'}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="mt-14 space-y-1 pl-28">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-xl font-bold text-neutral-900">{user.name}</h2>
                                    {isVerified && <CheckCircle2 className="w-5 h-5 text-blue-500 fill-blue-50" />}
                                </div>
                                <p className="text-sm text-neutral-500 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> {profileLocation}
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
                            <ProfilePhotoUploader
                                endpoint="/profiles/me/photo"
                                currentUrl={profilePhoto}
                                onUploaded={(url) => setProfilePhoto(url)}
                            />
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
                        requestUpdateEndpoint="/wallets/kyc/request-update"
                        prefillIdNumber={(user as any).idNumber ?? ''}
                        ownerUpdatedAt={(profileData as any)?.updatedAt ?? (user as any).updatedAt}
                        prerequisiteMet={profileComplete}
                        prerequisiteMessage="Complete Edit Profile before uploading KYC documents."
                        documentSlots={role === 'INDEPENDENT_AGENT'
                            ? [
                                {
                                    key: 'identity',
                                    label: 'ID or Passport',
                                    description: 'Used to verify your name and date of birth.',
                                    docType: 'IDENTITY',
                                    required: true
                                },
                                {
                                    key: 'address',
                                    label: 'Proof of Address',
                                    description: 'Utility bill or bank statement (optional).',
                                    docType: 'PROOF_ADDRESS'
                                },
                                {
                                    key: 'agent-cert',
                                    label: 'Independent Agent Certificate',
                                    description: 'Adds extra weight to your trust score.',
                                    docType: 'AGENT_CERT'
                                }
                            ]
                            : [
                                {
                                    key: 'identity',
                                    label: 'ID or Passport',
                                    description: 'Used to verify your name and date of birth.',
                                    docType: 'IDENTITY',
                                    required: true
                                },
                                {
                                    key: 'address',
                                    label: 'Proof of Address',
                                    description: 'Utility bill or bank statement (optional).',
                                    docType: 'PROOF_ADDRESS'
                                }
                            ]}
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

                    <Dialog open={editOpen} onOpenChange={setEditOpen}>
                        <DialogContent className="max-w-xl">
                            <DialogHeader>
                                <DialogTitle>Edit Profile</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Input
                                    placeholder="Full name"
                                    value={profileForm.name}
                                    onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })}
                                />
                                <Input
                                    placeholder="Phone"
                                    value={profileForm.phone}
                                    onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })}
                                />
                                <Input
                                    type="date"
                                    value={profileForm.dateOfBirth}
                                    onChange={(event) => setProfileForm({ ...profileForm, dateOfBirth: event.target.value })}
                                />
                                <Input
                                    placeholder="National ID / Passport"
                                    value={profileForm.idNumber}
                                    onChange={(event) => setProfileForm({ ...profileForm, idNumber: event.target.value })}
                                />
                                <Input
                                    placeholder="Address line"
                                    value={profileForm.addressLine1}
                                    onChange={(event) => setProfileForm({ ...profileForm, addressLine1: event.target.value })}
                                />
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-medium text-neutral-600">Town / City / Country</label>
                                    {locationLabel ? (
                                        <div className="mt-2 flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2 text-sm">
                                            <span>{locationLabel}</span>
                                            <Button variant="ghost" size="sm" onClick={clearLocation} className="gap-1 text-xs">
                                                <X className="h-3 w-3" /> Clear
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="relative mt-2">
                                            <div className="flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-2">
                                                <Search className="h-4 w-4 text-neutral-400" />
                                                <input
                                                    value={geoQuery}
                                                    onChange={(event) => setGeoQuery(event.target.value)}
                                                    placeholder="Start typing your town or city"
                                                    className="w-full text-sm outline-none"
                                                />
                                            </div>
                                            {showDropdown && geoResults.length > 0 && (
                                                <div className="absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-md border border-neutral-200 bg-white shadow-lg">
                                                    {geoResults.map((result) => (
                                                        <button
                                                            key={result.id}
                                                            type="button"
                                                            onClick={() => handleLocationSelect(result)}
                                                            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-neutral-50"
                                                        >
                                                            <span>{formatLocationDisplay(result)}</span>
                                                            <span className="text-xs text-neutral-400">{result.level}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            {isSearching && (
                                                <div className="mt-2 text-xs text-neutral-500">Searching...</div>
                                            )}
                                            {geoQuery.length >= 2 && !isSearching && geoResults.length === 0 && (
                                                <div className="mt-2 text-xs text-neutral-500">
                                                    No matches found. You can add a new location below.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {!showDropdown && geoQuery.length >= 2 && !isSearching && geoResults.length === 0 && (
                                        <div className="mt-3">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="gap-2"
                                                onClick={() => setShowNewLocationForm(!showNewLocationForm)}
                                            >
                                                <Plus className="h-3.5 w-3.5" /> Add new location
                                            </Button>
                                        </div>
                                    )}
                                    {showNewLocationForm && (
                                        <div className="mt-3 rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm">
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <Input
                                                    placeholder="New suburb/town name"
                                                    value={newSuburbName}
                                                    onChange={(event) => setNewSuburbName(event.target.value)}
                                                />
                                                <div className="relative">
                                                    <Input
                                                        placeholder="Search city"
                                                        value={citySearchQuery}
                                                        onChange={(event) => setCitySearchQuery(event.target.value)}
                                                    />
                                                    {showCityDropdown && cityResults.length > 0 && (
                                                        <div className="absolute z-10 mt-2 w-full rounded-md border border-neutral-200 bg-white shadow-lg">
                                                            {cityResults.map((result) => (
                                                                <button
                                                                    key={result.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedCity(result);
                                                                        setCitySearchQuery(formatLocationDisplay(result));
                                                                        setShowCityDropdown(false);
                                                                    }}
                                                                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-neutral-50"
                                                                >
                                                                    <span>{formatLocationDisplay(result)}</span>
                                                                    <span className="text-xs text-neutral-400">{result.level}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {isSearchingCity && (
                                                        <div className="mt-2 text-xs text-neutral-500">Searching cities...</div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="mt-3 flex items-center justify-between">
                                                <span className="text-xs text-neutral-500">
                                                    {selectedCity ? `Selected city: ${selectedCity.name}` : 'Select a city for the new suburb.'}
                                                </span>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={handleCreateNewSuburb}
                                                    disabled={isCreatingPending}
                                                >
                                                    {isCreatingPending ? 'Submitting…' : 'Submit for approval'}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
                                    <Button
                                        onClick={async () => {
                                            const payload: Record<string, string> = {};
                                            const setIfValue = (key: string, value?: string) => {
                                                const trimmed = value?.trim();
                                                if (trimmed) {
                                                    payload[key] = trimmed;
                                                }
                                            };

                                            setIfValue('name', profileForm.name);
                                            setIfValue('phone', profileForm.phone);
                                            setIfValue('dateOfBirth', profileForm.dateOfBirth);
                                            setIfValue('idNumber', profileForm.idNumber);
                                            setIfValue('addressLine1', profileForm.addressLine1);
                                            setIfValue('addressCity', profileForm.addressCity);
                                            setIfValue('addressProvince', profileForm.addressProvince);
                                            setIfValue('addressCountry', profileForm.addressCountry);
                                            setIfValue('location', profileForm.location);

                                            try {
                                                const res = await fetch(`${apiBaseUrl}/profiles/me`, {
                                                    method: 'PATCH',
                                                    headers: {
                                                        'Content-Type': 'application/json',
                                                        Authorization: `Bearer ${session?.accessToken}`
                                                    },
                                                    body: JSON.stringify(payload)
                                                });
                                                const data = await res.json().catch(() => null);
                                                if (!res.ok) {
                                                    notify.error(data?.message || 'Failed to update profile');
                                                    return;
                                                }
                                                await queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
                                                await queryClient.invalidateQueries({ queryKey: ['kyc-history', 'me'] });
                                                notify.success('Profile updated');
                                                setEditOpen(false);
                                            } catch (error) {
                                                console.error('Profile update failed', error);
                                                notify.error('Failed to update profile');
                                            }
                                        }}
                                    >
                                        Save changes
                                    </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

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
