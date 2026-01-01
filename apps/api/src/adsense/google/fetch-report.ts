import { Logger } from '@nestjs/common';

export interface AdSenseReportRow {
    date: string;
    impressions: number;
    clicks: number;
    earningsMicros: number;
}

export class FetchReportHelper {
    private readonly logger = new Logger(FetchReportHelper.name);

    async fetchDailyReport(token: string, date: Date): Promise<AdSenseReportRow[]> {
        this.logger.log(`Fetching AdSense report for ${date.toISOString().split('T')[0]} using token ${token}`);

        // Simulate API response
        // Randomize stats for demo
        const impressions = Math.floor(Math.random() * 5000) + 1000;
        const clicks = Math.floor(impressions * 0.02);
        const earningsMicros = Math.floor(clicks * 500000); // ~ $0.50 CPC

        return [{
            date: date.toISOString().split('T')[0],
            impressions,
            clicks,
            earningsMicros
        }];
    }
}
