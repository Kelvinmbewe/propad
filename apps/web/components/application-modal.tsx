'use client';

import { useState } from 'react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Textarea, useToast } from '@propad/ui';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ApplicationModalProps {
    propertyId: string;
    propertyTitle: string;
}

export function ApplicationModal({ propertyId, propertyTitle }: ApplicationModalProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [notes, setNotes] = useState('');
    const sdk = useAuthenticatedSDK();
    const { toast } = useToast();
    const router = useRouter();

    const handleSubmit = async () => {
        if (!sdk) {
            router.push('/auth/signin');
            return;
        }

        setLoading(true);
        try {
            await sdk.applications.apply({ propertyId, notes });
            toast({
                title: 'Application Submitted',
                description: 'Your application has been sent to the owner.',
            });
            setOpen(false);
            router.refresh();
        } catch (error) {
            console.error(error);
            toast({
                title: 'Error',
                description: 'Failed to submit application. You may have already applied.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Button size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => setOpen(true)}>
                Apply Now
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Apply for {propertyTitle}</DialogTitle>
                        <DialogDescription>
                            Introduce yourself to the landlord/agent. This increases your chances of being selected.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <Textarea
                            placeholder="Hi, I'm interested in this property because..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={5}
                        />
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={loading || !sdk} className="bg-emerald-600">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit Application
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
