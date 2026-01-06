import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ChargeableItemType } from '@propad/config';
// import { ChargeableItemType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { FeatureAccessService } from './feature-access.service';

interface AuthenticatedRequest {
  user: {
    userId: string;
  };
}

@Controller('features')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FeatureAccessController {
  constructor(private readonly featureAccess: FeatureAccessService) { }

  @Get('access/:featureType/:targetId')
  @Roles('USER', 'AGENT', 'LANDLORD', 'ADMIN')
  async checkAccess(
    @Req() req: AuthenticatedRequest,
    @Param('featureType') featureType: ChargeableItemType,
    @Param('targetId') targetId: string
  ) {
    return this.featureAccess.checkAccess(req.user.userId, featureType, targetId);
  }

  @Get('pricing/:featureType')
  @Roles('USER', 'AGENT', 'LANDLORD', 'ADMIN')
  async getPricing(@Param('featureType') featureType: ChargeableItemType) {
    return this.featureAccess.getPricingBreakdown(featureType);
  }
}

