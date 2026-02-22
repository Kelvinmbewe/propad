import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdvertisersService {
    constructor(private prisma: PrismaService) { }

    private async getAdvertiserIdForUser(user: { email?: string | null }) {
        if (!user.email) return null;
        const advertiser = await this.prisma.advertiser.findFirst({
            where: { contactEmail: user.email }
        });
        return advertiser?.id;
    }

    async getAdvertiserProfile(userId: string) {
        return this.prisma.user.findUnique({
            where: { id: userId },
        });
    }

    async getCampaigns(user: { userId: string, email?: string | null }) {
        const advertiserId = await this.getAdvertiserIdForUser(user);
        if (!advertiserId) return [];

        return this.prisma.adCampaign.findMany({
            where: { advertiserId },
            include: {
                stats: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async getStats(user: { userId: string, email?: string | null }) {
        const advertiserId = await this.getAdvertiserIdForUser(user);

        if (!advertiserId) {
            return {
                impressions: 0,
                clicks: 0,
                spend: 0,
                campaigns: 0
            };
        }

        const campaigns = await this.prisma.adCampaign.findMany({
            where: { advertiserId },
            include: { stats: true }
        });

        let impressions = 0;
        let clicks = 0;
        let spendMicros = 0;

        for (const campaign of campaigns) {
            for (const stat of campaign.stats) {
                impressions += stat.impressions;
                clicks += stat.clicks;
                spendMicros += stat.revenueMicros; // Revenue for us, spend for them
            }
        }

        return {
            impressions,
            clicks,
            spend: spendMicros / 1_000_000,
            campaigns: campaigns.length
        };
    }
}
