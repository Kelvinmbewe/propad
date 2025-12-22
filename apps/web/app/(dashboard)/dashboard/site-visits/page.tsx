import { Construction, Server } from 'lucide-react';
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

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Construction className="h-5 w-5 text-amber-500" />
                            UI Pending
                        </CardTitle>
                        <CardDescription>
                            The interface for site visits is currently under development.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-neutral-500">
                            This module allows admins/moderators to:
                        </p>
                        <ul className="list-disc pl-5 mt-2 text-sm text-neutral-600 space-y-1">
                            <li>Assign verifiers to properties</li>
                            <li>Track visit reports status</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Server className="h-5 w-5 text-green-500" />
                            Backend Ready
                        </CardTitle>
                        <CardDescription>
                            API services are deployed and active.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm font-mono bg-neutral-100 p-3 rounded-md text-neutral-600">
                            POST /api/site-visits/request
                            <br />
                            GET /api/site-visits/pending
                            <br />
                            POST /api/site-visits/:id/assign
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
