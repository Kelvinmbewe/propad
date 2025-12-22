import { Construction } from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@propad/ui';

export default function SiteVisitsPage() {
    return (
        <div className="flex flex-col gap-6">
            <header>
                <h1 className="text-2xl font-semibold text-neutral-900">Site Visits</h1>
                <p className="text-sm text-neutral-600">
                    Manage and schedule verification visits.
                </p>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Construction className="h-5 w-5 text-amber-500" />
                        Feature Under Construction
                    </CardTitle>
                    <CardDescription>
                        The site visits management module is currently being implemented.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-neutral-500">
                        This module will allow admins and moderators to:
                    </p>
                    <ul className="list-disc pl-5 mt-2 text-sm text-neutral-600 space-y-1">
                        <li>Assign verifiers to properties</li>
                        <li>Track visit status and reports</li>
                        <li>Manage travel logistics and scheduling</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
