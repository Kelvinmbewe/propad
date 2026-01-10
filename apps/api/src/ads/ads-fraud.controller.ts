import { Controller, Get, Param, Post, UseGuards, Query, Body, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client'; // or from SDK
import { PrismaService } from '../prisma/prisma.service';
import { FraudDetectionService } from './fraud/fraud-detection.service';

@Controller('admin/ads/fraud')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'TRUST_RISK' as any) // Assuming TRUST_RISK role exists or will exist, casting for safety
export class AdsFraudController {
    constructor(
        private prisma: PrismaService,
        private fraudService: FraudDetectionService
    ) { }

    @Get('events')
    async getRecentFraudEvents(@Query('limit') limit = '50') {
        return this.prisma.fraudEvent.findMany({
            take: parseInt(limit),
            orderBy: { createdAt: 'desc' },
            include: {
                campaign: { select: { name: true, id: true } },
                advertiser: { select: { businessName: true, id: true } }
            }
        });
    }

    @Get('campaign/:id')
    async getCampaignFraudStats(@Param('id') id: string) {
        const events = await this.prisma.fraudEvent.findMany({
            where: { campaignId: id },
            orderBy: { createdAt: 'desc' },
            take: 20
        });

        const stats = await this.prisma.fraudEvent.groupBy({
            by: ['severity'],
            where: { campaignId: id },
            _count: true
        });

        return { events, stats };
    }

    @Post(':eventId/resolve')
    async resolveFraudEvent(@Param('eventId') eventId: string, @Body() body: { resolution: string }) {
        // Mock resolution logic
        return { success: true, message: 'Event resolved', resolution: body.resolution };
    }

    @Post('campaign/:id/pause')
    async forcePauseCampaign(@Param('id') id: string) {
        await this.prisma.adCampaign.update({
            where: { id },
            data: { status: 'PAUSED' }
        });
        return { success: true, message: 'Campaign paused due to fraud risk' };
    }
}
