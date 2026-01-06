import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Currency, OwnerType } from '@prisma/client';
import { PayoutMethod } from '@propad/config';
// import { Currency, OwnerType, PayoutMethod } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PayoutsService } from './payouts.service';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { z } from 'zod';

interface AuthenticatedRequest {
  user: {
    userId: string;
  };
}

const createPayoutRequestSchema = z.object({
  ownerType: z.enum(['USER', 'AGENCY']),
  ownerId: z.string().optional(),
  amountCents: z.number().int().positive(),
  method: z.enum(['ECOCASH', 'BANK', 'WALLET']),
  payoutAccountId: z.string(),
  currency: z.enum(['USD', 'ZWG']).optional()
});

@Controller('payouts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PayoutsController {
  constructor(private readonly service: PayoutsService) { }

  @Post('request')
  createRequest(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createPayoutRequestSchema)) body: z.infer<typeof createPayoutRequestSchema>
  ) {
    return this.service.createPayoutRequest(
      body.ownerType as OwnerType,
      body.ownerId ?? req.user.userId,
      body.amountCents,
      body.method as PayoutMethod,
      body.payoutAccountId,
      body.currency as Currency
    );
  }

  @Get('my')
  getMyPayouts(@Req() req: AuthenticatedRequest) {
    return this.service.getUserPayoutRequests(req.user.userId);
  }

  @Get('pending')
  @Roles('ADMIN')
  getPendingPayouts() {
    return this.service.getPendingPayouts();
  }

  @Patch(':id/approve')
  @Roles('ADMIN')
  approvePayout(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string
  ) {
    return this.service.approvePayout(id, req.user.userId);
  }

  @Patch(':id/reject')
  @Roles('ADMIN')
  rejectPayout(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body('reason') reason: string
  ) {
    return this.service.rejectPayout(id, reason, req.user.userId);
  }

  @Patch(':id/process')
  @Roles('ADMIN')
  processPayout(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body('gatewayRef') gatewayRef: string
  ) {
    return this.service.processPayout(id, gatewayRef, req.user.userId);
  }

  @Patch(':id/paid')
  @Roles('ADMIN')
  markPayoutPaid(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string
  ) {
    return this.service.markPayoutPaid(id, req.user.userId);
  }

  @Post('transactions/:transactionId/execute')
  @Roles('ADMIN')
  executePayout(
    @Req() req: AuthenticatedRequest,
    @Param('transactionId') transactionId: string
  ) {
    return this.service.executePayout(transactionId, req.user.userId);
  }
}

