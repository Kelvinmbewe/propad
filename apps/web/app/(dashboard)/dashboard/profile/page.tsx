'use client';

import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, Avatar, AvatarImage, AvatarFallback, Badge } from '@propad/ui';
import { User, Shield, Building } from 'lucide-react';

export default function ProfilePage() {
    const { data: session } = useSession();
    const user = session?.user;

    if (!user) return null;

    return (
        <div className="flex flex-col gap-6">
            <header>
                <h1 className="text-2xl font-semibold text-neutral-900">My Profile</h1>
                <p className="text-sm text-neutral-600">
                    Manage your account settings and preferences.
                </p>
            </header>

            <div className="grid gap-6 md:grid-cols-[300px_1fr]">
                <Card>
                    <CardHeader className="flex flex-col items-center text-center">
                        <Avatar className="h-24 w-24 mb-4">
                            <AvatarImage src={user.image || ''} />
                            <AvatarFallback>{user.name?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        <CardTitle>{user.name}</CardTitle>
                        <p className="text-sm text-neutral-500">{user.email}</p>
                        <div className="mt-4 flex gap-2">
                            <Badge variant="secondary" className="flex items-center gap-1">
                                <Shield className="h-3 w-3" />
                                {user.role}
                            </Badge>
                            {user.isVerified && (
                                <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">Verified</Badge>
                            )}
                        </div>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Account Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-medium text-neutral-500 uppercase">User ID</label>
                                <p className="font-mono text-sm">{user.id}</p>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-neutral-500 uppercase">Phone</label>
                                <p className="text-sm">{user.phone || 'Not set'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
