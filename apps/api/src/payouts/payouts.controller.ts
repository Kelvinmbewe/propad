import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PayoutsService } from './payouts.service';
import { RequestPayoutDto, requestPayoutSchema } from './dto/request-payout.dto';
import { ApprovePayoutDto, approvePayoutSchema } from './dto/approve-payout.dto';
import { PayoutWebhookDto, payoutWebhookSchema } from './dto/payout-webhook.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    role: Role;
  };
}

@Controller('payouts')
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT, Role.ADMIN)
  @Post('request')
  request(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(requestPayoutSchema)) dto: RequestPayoutDto
  ) {
    return this.payoutsService.request(dto, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post(':id/approve')
  approve(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(approvePayoutSchema)) dto: ApprovePayoutDto
  ) {
    return this.payoutsService.approve(id, dto, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post(':id/pay')
  pay(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.payoutsService.markPaid(id, req.user);
  }

  @Post('webhook')
  webhook(@Body(new ZodValidationPipe(payoutWebhookSchema)) dto: PayoutWebhookDto) {
    return this.payoutsService.handleWebhook(dto);
  }
}
