import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AdsService } from './ads.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@propad/config';

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

  @Post('ingest')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async ingestRevenue(@Body() body: { date?: string; amountCents?: number; source?: string }) {
    const date = body.date ? new Date(body.date) : new Date();

    if (body.source === 'INHOUSE') {
      return this.adsService.aggregateInHouseRevenue(date);
    }

    if (body.amountCents) {
      return this.adsService.ingestDailyRevenue(date, body.amountCents);
    }

    return { message: 'Invalid payload' };
  }
}
