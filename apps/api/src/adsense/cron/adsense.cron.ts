import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AdSenseService } from '../adsense.service';

@Injectable()
export class AdSenseCron {
    private readonly logger = new Logger(AdSenseCron.name);

    constructor(private readonly adsenseService: AdSenseService) { }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleDailySync() {
        this.logger.log('Running daily AdSense sync...');
        await this.adsenseService.syncDailyStats();
    }
}
