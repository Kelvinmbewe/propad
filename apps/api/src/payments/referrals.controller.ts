import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Currency } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ReferralsService } from './referrals.service';

interface AuthenticatedRequest {
  user: {
    userId: string;
  };
}

@Controller('referrals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReferralsController {
  constructor(private readonly service: ReferralsService) {}

  @Get('earnings')
  getMyEarnings(@Req() req: AuthenticatedRequest) {
    return this.service.getUserReferralEarnings(req.user.userId);
  }

  @Get('earnings/summary')
  getEarningsSummary(@Req() req: AuthenticatedRequest) {
    return this.service.getReferralEarningsSummary(req.user.userId);
  }

  @Get('config')
  @Roles('ADMIN')
  getConfig() {
    return this.service.getReferralConfig();
  }

  @Patch('config')
  @Roles('ADMIN')
  updateConfig(
    @Req() req: AuthenticatedRequest,
    @Body('config') config: {
      enabled?: boolean;
      percentage?: number;
      minPayout?: number;
      eligibilityRules?: string[];
    }
  ) {
    return this.service.updateReferralConfig(config, req.user.userId);
  }
}

