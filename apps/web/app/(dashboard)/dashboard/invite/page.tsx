'use client';

import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Badge } from '@propad/ui';
import { Users, Copy, Gift } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

export default function InvitePage() {
    const sdk = useAuthenticatedSDK();
    const { data: session } = useSession();
    const [email, setEmail] = useState('');
    const [copied, setCopied] = useState(false);

    const { data: codeData, isLoading } = useQuery({
        queryKey: ['growth', 'referrals', 'code'],
        queryFn: async () => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/growth/invites/stats`, {
                headers: { Authorization: `Bearer ${session?.accessToken}` }
            });
            return res.json();
        }
    });

    const copyCode = () => {
        if (codeData?.code) {
            navigator.clipboard.writeText(codeData.code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">Invite Friends</h1>
            <p className="text-sm text-neutral-500">Earn rewards by inviting others to ProPad.</p>

            <div className="grid gap-4 md:grid-cols-2">
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Gift className="h-5 w-5 text-indigo-500" /> Your Referral Code
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Input value={codeData?.code || 'Loading...'} readOnly className="font-mono text-center text-lg" />
                            <Button onClick={copyCode} variant="outline">
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                        {copied && <p className="text-xs text-green-600 text-center">Copied to clipboard!</p>}
                        <p className="text-sm text-neutral-500">
                            Share this code. When they verify their first property, you both earn rewards.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" /> Your Impact
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{codeData?.usageCount || 0}</div>
                        <p className="text-sm text-neutral-500">Friends referred</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
