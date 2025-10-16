import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { MetricsService } from './metrics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { DailyAdsQueryDto, dailyAdsQuerySchema } from './dto/daily-ads-query.dto';
import { TopAgentsQueryDto, topAgentsQuerySchema } from './dto/top-agents-query.dto';
import { GeoListingsQueryDto, geoListingsQuerySchema } from './dto/geo-listings-query.dto';

@Controller('admin/metrics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('overview')
  overview() {
    return this.metricsService.getOverview();
  }

  @Get('ads/daily')
  dailyAds(@Query(new ZodValidationPipe(dailyAdsQuerySchema)) query: DailyAdsQueryDto) {
    return this.metricsService.getDailyAds(query);
  }

  @Get('agents/top')
  topAgents(@Query(new ZodValidationPipe(topAgentsQuerySchema)) query: TopAgentsQueryDto) {
    return this.metricsService.getTopAgents(query.limit);
  }

  @Get('geo/listings')
  geoListings(@Query(new ZodValidationPipe(geoListingsQuerySchema)) query: GeoListingsQueryDto) {
    return this.metricsService.getGeoListings(query.city);
  }
}
