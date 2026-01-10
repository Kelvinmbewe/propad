import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AdsCron {
    private readonly logger = new Logger(AdsCron.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditService,
    ) { }

    @Cron(CronExpression.EVERY_HOUR)
    async handleCampaignExpiration() {
        this.logger.log('Checking for expired campaigns...');
        const now = new Date();

        try {
            const expired = await this.prisma.adCampaign.findMany({
                where: {
                    status: 'ACTIVE',
                    endAt: { lte: now },
                },
            });

            for (const campaign of expired) {
                await this.prisma.adCampaign.update({
                    where: { id: campaign.id },
                    data: { status: 'ENDED' },
                });

                this.logger.log(`Campaign expired: ${campaign.id} (${campaign.name})`);

                await this.audit.logAction({
                    action: 'ads.campaign.expire',
                    actorId: 'system',
                    targetType: 'adCampaign',
                    targetId: campaign.id,
                    metadata: { reason: 'EndDate reached' },
                });
            }
        } catch (error) {
            this.logger.error('Failed to process campaign expiration', error instanceof Error ? error.stack : String(error));
        }
    }

    @Cron(CronExpression.EVERY_HOUR)
    async autoPauseFraudCampaigns() {
        this.logger.log('Checking for campaigns with high fraud activity...');
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);

        try {
            // Group by campaign and count HIGH severity fraud events
            const fraudStats = await this.prisma.fraudEvent.groupBy({
                by: ['campaignId'],
                where: {
                    createdAt: { gte: oneHourAgo },
                    severity: 'HIGH'
                },
                _count: {
                    _all: true
                },
                having: {
                    campaignId: { _count: { gt: 10 } } // Threshold: > 10 confimed fraud blocks in 1 hour
                }
            });

            for (const stat of fraudStats) {
                const count = stat._count._all;

                // Verify campaign is currently active
                const campaign = await this.prisma.adCampaign.findUnique({
                    where: { id: stat.campaignId }
                });

                if (campaign && campaign.status === 'ACTIVE') {
                    this.logger.warn(`Auto-pausing campaign ${stat.campaignId} due to high fraud detected (${count} events)`);

                    await this.prisma.adCampaign.update({
                        where: { id: stat.campaignId },
                        data: { status: 'PAUSED' }
                    });

                    await this.audit.logAction({
                        action: 'ads.campaign.autopause',
                        actorId: 'system',
                        targetType: 'adCampaign',
                        targetId: stat.campaignId,
                        metadata: { reason: 'High Fraud Rate', count }
                    });
                }
            }
        } catch (error) {
            this.logger.error('Failed to process fraud auto-pause', error instanceof Error ? error.stack : String(error));
        }
    }
}
