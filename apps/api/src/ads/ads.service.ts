import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdsService {
  constructor(private prisma: PrismaService) { }

  async getActiveCampaigns() {
    return this.prisma.adCampaign.findMany({
      where: { status: 'ACTIVE' },
      include: {
        flights: {
          include: {
            creative: true,
            placement: true,
          },
        },
      },
    });
  }

  async getCampaignStats(campaignId: string) {
    return this.prisma.adStat.findMany({
      where: { campaignId },
    });
  }

  async ingestDailyRevenue(date: Date, grossUsdCents: number) {
    // Upsert daily revenue metric
    const dateKey = new Date(date);
    dateKey.setUTCHours(0, 0, 0, 0);

    return this.prisma.metricDailyRevenue.upsert({
      where: { date: dateKey },
      update: {
        grossUsdCents: { increment: grossUsdCents },
      },
      create: {
        date: dateKey,
        grossUsdCents: grossUsdCents,
        payoutsUsdCents: 0,
      },
    });
  }

  async aggregateInHouseRevenue(date: Date) {
    const dateKey = new Date(date);
    dateKey.setUTCHours(0, 0, 0, 0);
    const nextDay = new Date(dateKey);
    nextDay.setDate(nextDay.getDate() + 1);

    // 1. Sum ad impressions revenue for the day
    const match = await this.prisma.adImpression.aggregate({
      where: {
        createdAt: {
          gte: dateKey,
          lt: nextDay,
        },
      },
      _sum: {
        revenueMicros: true,
      },
    });

    const revenueMicros = match._sum.revenueMicros || 0;
    const revenueCents = Math.floor(revenueMicros / 10000); // micros to cents

    if (revenueCents > 0) {
      await this.ingestDailyRevenue(dateKey, revenueCents);
    }

    return { date: dateKey, revenueCents };
  }
