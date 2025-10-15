import { Body, Controller, Post } from '@nestjs/common';
import { AdsService } from './ads.service';
import { CreateAdImpressionDto } from './dto/create-ad-impression.dto';

@Controller('ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  @Post('impressions')
  logImpression(@Body() dto: CreateAdImpressionDto) {
    return this.adsService.logImpression(dto);
  }
}
