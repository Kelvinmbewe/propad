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
}
