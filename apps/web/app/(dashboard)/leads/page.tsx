'use client';

import { useLeads } from '../../../hooks/use-leads';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Skeleton, Badge, Button } from '@propad/ui';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Phone, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function LeadsPage() {
    const { leads, isLoading } = useLeads();

    if (isLoading) {
        return <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>;
    }

    if (!leads || leads.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-center space-y-4">
                <div className="p-4 bg-muted rounded-full">
                    <MessageSquare className="h-8 w-8 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold">No leads found</h2>
                <p className="text-muted-foreground">
                    When users contact you about properties, they will appear here.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
                <Badge variant="secondary">{leads.length} Total</Badge>
            </div>

            <div className="space-y-4">
                {leads.map((lead: any) => (
                    <Card key={lead.id} className="transition-all hover:bg-muted/5">
                        <div className="flex flex-col md:flex-row md:items-center p-6 gap-4">
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                    <Badge variant={lead.status === 'NEW' ? 'default' : 'outline'}>
                                        {lead.status}
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">
                                        Via {lead.source}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                        • {formatDistanceToNow(new Date(lead.createdAt))} ago
                                    </span>
                                </div>
                                <div className="font-medium">
                                    Property: <Link href={`/properties/${lead.property.id}`} className="hover:underline text-primary">{lead.property.title}</Link>
                                </div>
                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                    <Phone className="h-3 w-3" /> {lead.contactPhone}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={`/properties/${lead.property.id}`}>View Property</Link>
                                </Button>
                                {/* Add action buttons here like "Mark Contacted" */}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
