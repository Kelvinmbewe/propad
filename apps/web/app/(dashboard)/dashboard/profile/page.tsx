'use client';

import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Avatar, AvatarImage, AvatarFallback, Badge, Button } from '@propad/ui';
import { User, Shield, Building, CreditCard, Star, MapPin, CheckCircle2, UserCheck } from 'lucide-react';
import { format } from 'date-fns';

export default function ProfilePage() {
    const { data: session } = useSession();
    const user = session?.user;

    if (!user) return null;

    // Type assertion because we just added these fields to the backend SanitizedUser, 
    // but NextAuth types on client might naturally lag without full type re-generation/augmentation.
    // In a real app, we'd update types/next-auth.d.ts. 
    // For now, access them safely.
    const trustScore = (user as any).trustScore ?? 0;
    const verificationScore = (user as any).verificationScore ?? 0;
    const isVerified = (user as any).isVerified ?? false;
    const kycStatus = (user as any).kycStatus || 'PENDING';

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
                                <Avatar className="h-24 w-24 border-4 border-white shadow-sm">
                                    <AvatarImage src={user.image || ''} />
                                    <AvatarFallback className="text-xl font-bold bg-neutral-100 text-neutral-600">
                                        {user.name?.charAt(0) || 'U'}
                                    </AvatarFallback>
                                </Avatar>
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
