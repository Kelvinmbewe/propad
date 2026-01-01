import { Module } from '@nestjs/common';
import { AdsService } from './ads.service';
import { AdsController } from './ads.controller';
import { AdEventsService } from './events/ad-events.service';

@Module({
  providers: [AdsService, AdEventsService],
  controllers: [AdsController],
  exports: [AdsService, AdEventsService],
})
export class AdsModule { }
