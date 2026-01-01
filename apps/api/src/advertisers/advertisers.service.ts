import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdvertisersService {
    constructor(private prisma: PrismaService) { }

    async getAdvertiserProfile(userId: string) {
        // Note: Currently advertiser is a role on User, we might need a profile model later
        return this.prisma.user.findUnique({
            where: { id: userId },
        });
    }

    async getCampaigns(userId: string) {
        // This assumes we have a way to link user to advertiser
        // For now, let's look for advertiser records where contactEmail might match or just list all
        return this.prisma.adCampaign.findMany({
            include: { advertiser: true },
        });
    }
}
