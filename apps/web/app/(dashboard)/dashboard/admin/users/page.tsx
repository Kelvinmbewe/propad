import { Construction } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@propad/ui';

export default function AdminUsersPage() {
    return (
        <div className="flex flex-col gap-6">
            <header>
                <h1 className="text-2xl font-semibold text-neutral-900">User Management</h1>
                <p className="text-sm text-neutral-600">
                    Administer users, roles, and permissions.
                </p>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Construction className="h-5 w-5 text-amber-500" />
                        Coming Soon
                    </CardTitle>
                    <CardDescription>
                        User administration panel is currently in development.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-neutral-500">
                        Planned features:
                    </p>
                    <ul className="list-disc pl-5 mt-2 text-sm text-neutral-600 space-y-1">
                        <li>Role assignment (Admin, Moderator, Agent)</li>
                        <li>Account status management (Ban/Suspend)</li>
                        <li>KYC verification overrides</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
