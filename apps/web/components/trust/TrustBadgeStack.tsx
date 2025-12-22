
import React from 'react';
import { BadgeCheck, Shield, MapPin, Star, Building, UserCheck } from 'lucide-react';

interface TrustBadge {
    id: string;
    label: string;
    icon: string;
    description: string;
}

interface TrustBadgeStackProps {
    badges: TrustBadge[];
    size?: 'sm' | 'md' | 'lg';
}

const iconMap: Record<string, any> = {
    'verified_user': UserCheck,
    'verified': BadgeCheck,
    'shield': Shield,
    'stars': Star,
    'location_on': MapPin,
    'beenhere': MapPin,
    'business': Building,
    'military_tech': Shield,
};

export function TrustBadgeStack({ badges, size = 'md' }: TrustBadgeStackProps) {
    if (!badges || badges.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-2">
            {badges.map((badge) => {
                const Icon = iconMap[badge.icon] || Shield;
                return (
                    <div
                        key={badge.id}
                        className={`
                            flex items-center gap-2 rounded-full border px-3 py-1 bg-white/50 backdrop-blur-sm
                            ${size === 'sm' ? 'text-xs' : 'text-sm'}
                            border-emerald-100 text-emerald-800
                        `}
                        title={badge.description}
                    >
                        <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
                        <span className="font-medium">{badge.label}</span>
                    </div>
                );
            })}
        </div>
    );
}
