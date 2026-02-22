import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export interface TrustBadge {
    id: string;
    label: string;
    icon: string; // Internal icon key (e.g. 'verified-user', 'shield')
    description: string;
}

@Injectable()
export class BadgesHelper {

    getUserBadges(user: any): TrustBadge[] {
        const badges: TrustBadge[] = [];

        // Identity
        if (user.isVerified) {
            badges.push({
                id: 'IDENTITY_VERIFIED',
                label: 'Identity Verified',
                icon: 'verified_user',
                description: 'User identity has been confirmed via KYC.'
            });
        }

        // Trust Level
        if (user.trustScore >= 80) {
            badges.push({
                id: 'TRUSTED_USER',
                label: 'Trusted User',
                icon: 'stars',
                description: 'User has a high trust score based on history and reviews.'
            });
        }

        // Site Visits
        const completedVisits = user.siteVisitsAssigned?.filter((v: any) => v.status === 'COMPLETED').length || 0;
        if (completedVisits > 0) {
            badges.push({
                id: 'SITE_VISIT_CONTRIBUTOR',
                label: `Site Verifier (${completedVisits})`,
                icon: 'location_on',
                description: 'User has verified properties via physical site visits.'
            });
        }

        return badges;
    }

    getPropertyBadges(property: any): TrustBadge[] {
        const badges: TrustBadge[] = [];

        if (property.status === 'VERIFIED') { // Assuming PropertyStatus.VERIFIED exists now
            badges.push({
                id: 'LISTING_VERIFIED',
                label: 'Verified Listing',
                icon: 'verified',
                description: 'Listing meets verification standards.'
            });
        }

        // Site Visit Verified
        const siteVisit = property.siteVisits?.find((v: any) => v.status === 'COMPLETED');
        if (siteVisit) {
            badges.push({
                id: 'SITE_VISITED',
                label: 'Physically Verified',
                icon: 'beenhere',
                description: 'A moderator has physically visited this property.'
            });
        }

        if (property.trustScore >= 80) {
            badges.push({
                id: 'HIGH_TRUST_PROPERTY',
                label: 'High Trust',
                icon: 'shield',
                description: 'This property has excellent ratings and history.'
            });
        }

        return badges;
    }

    getAgencyBadges(agency: any): TrustBadge[] {
        const badges: TrustBadge[] = [];

        if (agency.verificationScore >= 40) { // Arbitrary threshold for verified agency
            badges.push({
                id: 'VERIFIED_AGENCY',
                label: 'Verified Agency',
                icon: 'business',
                description: 'Agency registration and details verified.'
            });
        }

        if (agency.trustScore >= 80) {
            badges.push({
                id: 'ELITE_AGENCY',
                label: 'Elite Agency',
                icon: 'military_tech',
                description: 'Top-tier agency with consistent high performance.'
            });
        }

        return badges;
    }
}
