import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
// import { AdEventType } from '@prisma/client';
export type AdEventType = 'VIEW' | 'CLICK' | 'LEAD';

@Injectable()
export class AdEventsService {
    constructor(private prisma: PrismaService) { }

    async trackEvent(data: {
        campaignId: string;
        flightId: string;
        placementId: string;
        creativeId: string;
        userId?: string;
        type: AdEventType;
        metadata?: any;
        sessionId?: string;
        userAgent?: string;
        ipAddress?: string;
    }) {
        return this.prisma.adEvent.create({
            data: {
                ...data,
                metadata: data.metadata || {},
            },
        });
    }

    async getCampaignEvents(campaignId: string) {
        return this.prisma.adEvent.findMany({
            where: { campaignId },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
    }
}
