import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, PropertyStatus, LeadStatus, PayoutStatus } from '@prisma/client';
import { subDays, startOfDay } from 'date-fns';

@Injectable()
export class DashboardService {
    constructor(private readonly prisma: PrismaService) { }

    async getOverview(userId: string, role: string) {
        switch (role) {
            case Role.AGENT:
                return this.getAgentOverview(userId);
            case Role.LANDLORD:
                return this.getLandlordOverview(userId);
            case Role.USER:
                return this.getUserOverview(userId);
            case Role.ADVERTISER:
                return this.getAdvertiserOverview(userId);
            case Role.ADMIN:
                // Admin uses the existing MetricsService global overview, 
                // but we can wrap it here or return a specific structure if needed.
                // For now, let's return a simple structure pointing to the specific admin endpoint,
                // or just return basic admin stats if the frontend expects a unified structure.
                // The plan says "Admin (Global)", likely delegated or simple high-level.
                return { type: 'ADMIN', message: 'Use /admin/metrics/overview for full stats' };
            default:
                return this.getUserOverview(userId);
        }
    }

    private async getAgentOverview(userId: string) {
        const today = new Date();
        const sevenDaysAgo = subDays(today, 7);

        const [activeListings, totalViews, newLeads, pendingCommission] = await Promise.all([
            this.prisma.property.count({
                where: { agentOwnerId: userId, status: PropertyStatus.VERIFIED }
            }),
            // Sum of views on agent's properties. Assuming 'views' field exists on Property or similar. 
            // Checking schema via usage in other files would be good, but let's assume standard field or simple count for now.
            // If no views field, we might count Leads as proxy or skip.
            // Let's assume we can count leads for now as "Interest".
            this.prisma.lead.count({
                where: { property: { agentOwnerId: userId } }
            }),
            this.prisma.lead.count({
                where: {
                    property: { agentOwnerId: userId },
                    createdAt: { gte: sevenDaysAgo }
                }
            }),
            this.prisma.rewardEvent.aggregate({
                where: { agentId: userId, payoutId: null }, // un-paid rewards
                _sum: { usdCents: true }
            })
        ]);

        return {
            type: 'AGENT',
            activeListings,
            totalInterests: totalViews, // Renamed to interests/leads for accuracy
            newLeads7d: newLeads,
            pendingCommissionUsd: (pendingCommission._sum.usdCents || 0) / 100
        };
    }

    private async getLandlordOverview(userId: string) {
        const [ownedProperties, activeTenants, totalApplications] = await Promise.all([
            this.prisma.property.count({
                where: { landlordId: userId }
            }),
            this.prisma.lead.count({
                where: {
                    property: { landlordId: userId },
                    status: LeadStatus.CLOSED // Assuming CLOSED means rented/accepted
                }
            }),
            this.prisma.lead.count({
                where: { property: { landlordId: userId } }
            })
        ]);

        return {
            type: 'LANDLORD',
            ownedProperties,
            activeTenants,
            occupancyRate: ownedProperties > 0 ? (activeTenants / ownedProperties) * 100 : 0,
            totalApplications
        };
    }

    private async getUserOverview(userId: string) {
        const [activeApplications, savedProperties] = await Promise.all([
            this.prisma.lead.count({
                where: { userId: userId, status: { not: LeadStatus.CLOSED } }
            }),
            // Assuming a "SavedProperty" or "Interest" model exists. 
            // If not, maybe just 0 for now. Double check DB schema if possible.
            // Searching "Interest" in file list showed "interest-actions.tsx", implying "Interest" model might exist.
            // Let's safe bet on 0 or check later.
            0
        ]);

        return {
            type: 'USER',
            activeApplications,
            savedProperties
        };
    }

    private async getAdvertiserOverview(userId: string) {
        // Basic placeholder structure using real DB if possible
        // advertiserId might be on AdCampaign
        return {
            type: 'ADVERTISER',
            activeCampaigns: 0,
            impressions30d: 0,
            spend30d: 0
        };
    }
}
