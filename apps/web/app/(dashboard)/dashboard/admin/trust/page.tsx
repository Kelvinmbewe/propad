import { Construction } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@propad/ui';

export default function AdminTrustPage() {
    return (
        <div className="flex flex-col gap-6">
            <header>
                <h1 className="text-2xl font-semibold text-neutral-900">Trust & Risk</h1>
                <p className="text-sm text-neutral-600">
                    Monitor fraud signals, trust scores, and verification integrity.
                </p>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Construction className="h-5 w-5 text-amber-500" />
                        Module In Progress
                    </CardTitle>
                    <CardDescription>
                        Advanced trust graph and risk monitoring tools are being set up.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-neutral-500">
                        Future capabilities:
                    </p>
                    <ul className="list-disc pl-5 mt-2 text-sm text-neutral-600 space-y-1">
                        <li>Global fraud alerts and blacklists</li>
                        <li>Trust Score calibration</li>
                        <li>Identity verification logs</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
