'use client';

import { useInterests } from '../../../hooks/use-interests';
import { Card, CardContent, CardHeader, CardTitle, Skeleton, Badge, Button } from '@propad/ui';
import { Home, Heart, MapPin, Bed, Bath, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { getImageUrl } from '@/lib/image-url';

export default function SavedPropertiesPage() {
    const { savedProperties, isLoading, toggleInterest } = useInterests();

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-48" />
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <Card key={i}>
                            <CardHeader className="h-48 bg-muted animate-pulse" />
                            <CardContent className="p-4 space-y-4">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (!savedProperties || savedProperties.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
                <div className="p-4 bg-muted rounded-full">
                    <Heart className="h-8 w-8 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold">No saved properties yet</h2>
                <p className="text-muted-foreground max-w-sm">
                    Properties you mark as "Interested" will appear here for quick access.
                </p>
                <Button asChild>
                    <Link href="/properties">
                        Browse Properties
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Saved Properties</h1>
                <Badge variant="outline">{savedProperties.length} Saved</Badge>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {savedProperties.map((interest) => {
                    const property = interest.property;
                    return (
                        <Card key={interest.id} className="overflow-hidden group">
                            {/* Image Placeholder or Media */}
                            <div className="relative h-48 bg-muted">
                                {property.media?.[0]?.url ? (
                                    <img
                                        src={getImageUrl(property.media[0].url)}
                                        alt={property.title}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full">
                                        <Home className="h-10 w-10 text-muted-foreground/50" />
                                    </div>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2 bg-white/80 hover:bg-white text-red-500 hover:text-red-600 rounded-full"
                                    onClick={() => toggleInterest.mutate(property.id)}
                                >
                                    <Heart className="h-5 w-5 fill-current" />
                                </Button>
                                <Badge className="absolute bottom-2 left-2 bg-black/70 hover:bg-black/80">
                                    {property.currency} {Number(property.price).toLocaleString()}
                                </Badge>
                            </div>

                            <CardContent className="p-4 space-y-3">
                                <div className="space-y-1">
                                    <h3 className="font-semibold truncate">{property.title}</h3>
                                    <div className="flex items-center text-sm text-muted-foreground">
                                        <MapPin className="mr-1 h-3 w-3" />
                                        {property.location?.suburb?.name}, {property.location?.city?.name}
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 text-sm">
                                    <div className="flex items-center gap-1">
                                        <Bed className="h-4 w-4" />
                                        <span>{property.bedrooms || '-'} Beds</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Bath className="h-4 w-4" />
                                        <span>{property.bathrooms || '-'} Baths</span>
                                    </div>
                                </div>

                                <Button className="w-full" variant="outline" asChild>
                                    <Link href={`/properties/${property.id}`}>
                                        View Details <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    );
}
