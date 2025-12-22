import { Construction } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@propad/ui';

export default function AdminAgenciesPage() {
    return (
        <div className="flex flex-col gap-6">
            <header>
                <h1 className="text-2xl font-semibold text-neutral-900">Agency Management</h1>
                <p className="text-sm text-neutral-600">
                    Oversee real estate companies and agency profiles.
                </p>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Construction className="h-5 w-5 text-amber-500" />
                        Under Development
                    </CardTitle>
                    <CardDescription>
                        The agency directory and management system is coming soon.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-neutral-500">
                        This section will support:
                    </p>
                    <ul className="list-disc pl-5 mt-2 text-sm text-neutral-600 space-y-1">
                        <li>Agency verification and onboarding</li>
                        <li>Agent roster management</li>
                        <li>Performance tracking and subscriptions</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
