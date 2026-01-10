import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ChargeableItemType } from '@propad/config';
import { Prisma } from '@prisma/client';
// import { ChargeableItemType, Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PricingService } from './pricing.service';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { z } from 'zod';

interface AuthenticatedRequest {
  user: {
    userId: string;
  };
}

const createPricingRuleSchema = z.object({
  priceUsdCents: z.number().int().positive(),
  currency: z.enum(['USD', 'ZWG']).optional(),
  commissionPercent: z.number().min(0).max(100).optional(),
  platformFeePercent: z.number().min(0).max(100).optional(),
  agentSharePercent: z.number().min(0).max(100).optional(),
  referralSharePercent: z.number().min(0).max(100).optional(),
  rewardPoolSharePercent: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional()
});

@Controller('pricing')
@UseGuards(JwtAuthGuard)
export class PricingController {
  constructor(private readonly service: PricingService) { }

  @Get()
  @Roles('ADMIN')
  getAllRules() {
    return this.service.getAllPricingRules();
  }

  @Get(':itemType')
  getRule(@Param('itemType') itemType: ChargeableItemType) {
    return this.service.getPricingRule(itemType);
  }

  @Post(':itemType/calculate')
  calculatePrice(
    @Param('itemType') itemType: ChargeableItemType,
    @Body('baseAmountUsdCents') baseAmountUsdCents?: number,
    @Body('currency') currency?: 'USD' | 'ZWG'
  ) {
    return this.service.calculatePrice(itemType, baseAmountUsdCents, currency);
  }

  @Post(':itemType')
  @Roles('ADMIN')
  createOrUpdate(
    @Req() req: AuthenticatedRequest,
    @Param('itemType') itemType: ChargeableItemType,
    @Body(new ZodValidationPipe(createPricingRuleSchema)) body: z.infer<typeof createPricingRuleSchema>
  ) {
    return this.service.createOrUpdatePricingRule(itemType, { ...body, metadata: body.metadata as Prisma.InputJsonValue }, req.user.userId);
  }

  @Patch(':itemType/toggle')
  @Roles('ADMIN')
  toggleActive(
    @Req() req: AuthenticatedRequest,
    @Param('itemType') itemType: ChargeableItemType,
    @Body('isActive') isActive: boolean
  ) {
    return this.service.toggleActive(itemType, isActive, req.user.userId);
  }
}

