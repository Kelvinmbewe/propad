import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, Role } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { DailyAdsQueryDto, dailyAdsQuerySchema } from './dto/daily-ads-query.dto';
import { TopAgentsQueryDto, topAgentsQuerySchema } from './dto/top-agents-query.dto';
import { GeoListingsQueryDto, geoListingsQuerySchema } from './dto/geo-listings-query.dto';

@Controller('admin/metrics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) { }

  @Get('overview')
  overview() {
    return this.metricsService.getOverview();
  }

  @Get('system')
  systemMetrics() {
    return this.metricsService.getSystemMetrics();
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
