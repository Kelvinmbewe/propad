import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { WalletsService } from './wallets.service';
import { requestPayoutSchema, RequestPayoutDto } from './dto/request-payout.dto';
import { approvePayoutSchema, ApprovePayoutDto } from './dto/approve-payout.dto';
import { payoutWebhookSchema, PayoutWebhookDto } from './dto/payout-webhook.dto';
import {
  createPayoutAccountSchema,
  CreatePayoutAccountDto
} from './dto/create-payout-account.dto';
import { submitKycSchema, SubmitKycDto } from './dto/submit-kyc.dto';
import { updateKycStatusSchema, UpdateKycStatusDto } from './dto/update-kyc-status.dto';
import {
  verifyPayoutAccountSchema,
  VerifyPayoutAccountDto
} from './dto/verify-payout-account.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    role: Role;
  };
}

@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT, Role.LANDLORD, Role.USER)
  @Get('me')
  me(@Req() req: AuthenticatedRequest) {
    return this.walletsService.getMyWallet(req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT, Role.ADMIN)
  @Get(':id/transactions')
  transactions(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.walletsService.listTransactions(id, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT, Role.LANDLORD, Role.USER)
  @Post('payout-accounts')
  createAccount(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createPayoutAccountSchema)) dto: CreatePayoutAccountDto
  ) {
    return this.walletsService.createPayoutAccount(dto, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('payout-accounts/:id/verify')
  verifyAccount(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(verifyPayoutAccountSchema)) dto: VerifyPayoutAccountDto
  ) {
    return this.walletsService.verifyPayoutAccount(id, dto, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT, Role.LANDLORD, Role.USER)
  @Post('kyc')
  submitKyc(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(submitKycSchema)) dto: SubmitKycDto
  ) {
    return this.walletsService.submitKyc(dto, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('kyc/:id/status')
  updateKycStatus(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(updateKycStatusSchema)) dto: UpdateKycStatusDto
  ) {
    return this.walletsService.updateKycStatus(id, dto, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT)
  @Post('payouts')
  requestPayout(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(requestPayoutSchema)) dto: RequestPayoutDto
  ) {
    return this.walletsService.requestPayout(dto, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('payouts/:id/approve')
  approvePayout(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(approvePayoutSchema)) dto: ApprovePayoutDto
  ) {
    return this.walletsService.approvePayout(id, dto, req.user);
  }

  @Post('payouts/webhook')
  webhook(@Body(new ZodValidationPipe(payoutWebhookSchema)) dto: PayoutWebhookDto) {
    return this.walletsService.handleWebhook(dto);
  }
}
