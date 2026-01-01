import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleAuthHelper } from './google/auth';
import { FetchReportHelper } from './google/fetch-report';
import { DistributionEngine } from '../rewards/engine/distribution.engine';

@Injectable()
export class AdSenseService {
    private readonly logger = new Logger(AdSenseService.name);
    private readonly authHelper = new GoogleAuthHelper();
    private readonly reportHelper = new FetchReportHelper();

    constructor(private prisma: PrismaService) { }

    async syncDailyStats(date: Date = new Date()) {
        // Sync for YESTERDAY by default as today's data is incomplete
        const targetDate = new Date(date);
        targetDate.setDate(targetDate.getDate() - 1);
        targetDate.setHours(0, 0, 0, 0);

        this.logger.log(`Syncing AdSense stats for ${targetDate.toISOString()}`);

        try {
            const token = await this.authHelper.getAccessToken();
            const report = await this.reportHelper.fetchDailyReport(token, targetDate);

            if (report.length > 0) {
                const row = report[0];
                await this.prisma.adSenseDailyStat.upsert({
                    where: { date: targetDate },
                    update: {
                        impressions: row.impressions,
                        clicks: row.clicks,
                        revenueMicros: BigInt(row.earningsMicros),
                    },
                    create: {
                        date: targetDate,
                        impressions: row.impressions,
                        clicks: row.clicks,
                        revenueMicros: BigInt(row.earningsMicros),
                    },
                });

                await this.prisma.adSenseSync.create({
                    data: {
                        date: targetDate,
                        status: 'SUCCESS',
                        rawJson: row as any,
                    },
                });
                this.logger.log('AdSense sync successful');
            } else {
                this.logger.warn('No data returned from AdSense');
            }
        } catch (error: any) {
            this.logger.error(`AdSense sync failed: ${error.message}`);
            await this.prisma.adSenseSync.create({
                data: {
                    date: targetDate,
                    status: 'FAILED',
                    rawJson: { error: error.message },
                },
            });
        }
    }

    async getStats() {
        return this.prisma.adSenseDailyStat.findMany({
            orderBy: { date: 'desc' },
            take: 30,
        });
    }
}
