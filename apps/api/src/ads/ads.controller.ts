import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AdsService } from './ads.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) { }

  @Get('active')
  async getActive() {
    return this.adsService.getActiveCampaigns();
  }

  @Get('stats/:id')
  @UseGuards(JwtAuthGuard)
  async getStats(@Param('id') id: string) {
    return this.adsService.getCampaignStats(id);
  }
}
