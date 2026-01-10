import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { AdsService } from './ads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { Role } from '@propad/config';
import { CreateCampaignDto, createCampaignSchema } from './dto/create-campaign.dto';
import { UpdateCampaignDto, updateCampaignSchema } from './dto/update-campaign.dto';
import { TopupCampaignDto, topupCampaignSchema } from './dto/topup-campaign.dto';
import { TrackClickDto, trackClickSchema } from './dto/track-click.dto';
import { createAdImpressionSchema } from './dto/create-ad-impression.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    role: Role;
    email?: string | null;
  };
}

import { AdsInvoicesService } from './ads-invoices.service';

@Controller('ads')
export class AdsController {
  constructor(
    private readonly adsService: AdsService,
    private readonly invoices: AdsInvoicesService,
  ) { }

  // ========== PUBLIC ENDPOINTS ==========

  @Get('active')
  async getActive() {
    return this.adsService.getActiveCampaigns();
  }

  @Get('promoted')
  async getPromoted(
    @Query('cityId') cityId?: string,
    @Query('suburbId') suburbId?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adsService.getPromotedListings({
      cityId,
      suburbId,
      type,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // ========== CAMPAIGN CRUD ==========

  @Post('campaigns')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADVERTISER, Role.LANDLORD, Role.ADMIN)
  async createCampaign(
    @Body(new ZodValidationPipe(createCampaignSchema)) dto: CreateCampaignDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adsService.createCampaign(dto, req.user);
  }

  @Get('campaigns/my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADVERTISER, Role.LANDLORD, Role.ADMIN)
  async getMyCampaigns(@Req() req: AuthenticatedRequest) {
    return this.adsService.getMyCampaigns(req.user);
  }

  @Get('campaigns/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADVERTISER, Role.LANDLORD, Role.ADMIN)
  async getCampaignById(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adsService.getCampaignById(id, req.user);
  }

  @Get('campaigns/:id/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADVERTISER, Role.LANDLORD, Role.ADMIN)
  async getCampaignAnalytics(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adsService.getCampaignAnalytics(id, req.user);
  }

  @Get('analytics/summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADVERTISER, Role.LANDLORD, Role.ADMIN)
  async getAnalyticsSummary(@Req() req: AuthenticatedRequest) {
    const advertiserId = await this.adsService.getAdvertiserIdForUser(req.user);
    if (!advertiserId) {
      // Create advertiser if not exists (lazy profile creation)
      const campaign = await this.adsService.createCampaign({ name: req.user.email || 'Draft', type: 'PROPERTY_BOOST' } as any, req.user);
      return this.adsService.getAdvertiserAnalyticsSummary(campaign.advertiserId);
    }
    return this.adsService.getAdvertiserAnalyticsSummary(advertiserId);
  }

  @Get('analytics/campaign/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADVERTISER, Role.LANDLORD, Role.ADMIN)
  async getCampaignAnalyticsV2(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adsService.getCampaignAnalytics(id, req.user);
  }

  @Patch('campaigns/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADVERTISER, Role.LANDLORD, Role.ADMIN)
  async updateCampaign(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCampaignSchema)) dto: UpdateCampaignDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adsService.updateCampaign(id, dto, req.user);
  }

  @Post('campaigns/:id/pause')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADVERTISER, Role.LANDLORD, Role.ADMIN)
  async pauseCampaign(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adsService.pauseCampaign(id, req.user);
  }

  @Get('invoices/my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADVERTISER, Role.LANDLORD, Role.AGENT, Role.ADMIN)
  async getMyInvoices(@Req() req: AuthenticatedRequest) {
    const advertiserId = await this.adsService.getAdvertiserIdForUser(req.user);
    if (!advertiserId && req.user.role !== Role.ADMIN) {
      return [];
    }
    if (!advertiserId) return [];
    return this.invoices.getMyInvoices(advertiserId);
  }

  @Get('invoices/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADVERTISER, Role.LANDLORD, Role.AGENT, Role.ADMIN)
  async getInvoice(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const advertiserId = await this.adsService.getAdvertiserIdForUser(req.user);
    const invoice = await this.invoices.getInvoice(id, advertiserId || '');
    if (!invoice && req.user.role !== Role.ADMIN) {
      throw new NotFoundException('Invoice not found');
    }
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  @Post('campaigns/:id/resume')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADVERTISER, Role.LANDLORD, Role.ADMIN)
  async resumeCampaign(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adsService.resumeCampaign(id, req.user);
  }

  // ========== BALANCE ==========

  @Get('balance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADVERTISER, Role.LANDLORD, Role.ADMIN)
  async getBalance(@Req() req: AuthenticatedRequest) {
    return this.adsService.getAdvertiserBalance(req.user);
  }

  @Post('topup/:advertiserId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADVERTISER, Role.LANDLORD, Role.ADMIN)
  async topUp(
    @Param('advertiserId') advertiserId: string,
    @Body(new ZodValidationPipe(topupCampaignSchema)) dto: TopupCampaignDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adsService.topUp(advertiserId, dto.amountCents, req.user);
  }

  // ========== TRACKING ==========

  @Post('track/impression')
  async trackImpression(
    @Body(new ZodValidationPipe(createAdImpressionSchema)) dto: any,
  ) {
    return this.adsService.trackImpression(dto);
  }

  @Post('track/click')
  async trackClick(
    @Body(new ZodValidationPipe(trackClickSchema)) dto: TrackClickDto,
    @Req() req: any,
  ) {
    return this.adsService.trackClick(dto, req.user?.userId);
  }

  // ========== STATS (existing) ==========

  @Get('stats/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADVERTISER, Role.LANDLORD, Role.ADMIN)
  async getStats(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.adsService.getCampaignStats(id);
  }

  @Post('ingest')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async ingestRevenue(
    @Body() body: { date?: string; amountCents?: number; source?: string },
  ) {
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
