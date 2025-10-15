import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
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
import {
  listKycRecordsSchema,
  type ListKycRecordsDto
} from './dto/list-kyc-records.dto';
import {
  listPayoutRequestsSchema,
  type ListPayoutRequestsDto
} from './dto/list-payout-requests.dto';
import {
  listPayoutAccountsSchema,
  type ListPayoutAccountsDto
} from './dto/list-payout-accounts.dto';
import {
  manageAmlBlocklistSchema,
  type ManageAmlBlocklistDto
} from './dto/manage-aml-blocklist.dto';
import {
  upsertWalletThresholdSchema,
  type UpsertWalletThresholdDto
} from './dto/upsert-wallet-threshold.dto';

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
  @Get('payout-accounts')
  listPayoutAccounts(
    @Query(new ZodValidationPipe(listPayoutAccountsSchema)) query: ListPayoutAccountsDto
  ) {
    return this.walletsService.listPayoutAccounts(query);
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
  @Get('kyc')
  listKyc(
    @Query(new ZodValidationPipe(listKycRecordsSchema)) query: ListKycRecordsDto
  ) {
    return this.walletsService.listKycRecords(query);
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
  @Get('payouts')
  listPayouts(
    @Query(new ZodValidationPipe(listPayoutRequestsSchema)) query: ListPayoutRequestsDto
  ) {
    return this.walletsService.listPayoutRequests(query);
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('aml-blocklist')
  listAmlBlocklist() {
    return this.walletsService.listAmlBlocklist();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('aml-blocklist')
  addAmlBlocklist(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(manageAmlBlocklistSchema)) dto: ManageAmlBlocklistDto
  ) {
    return this.walletsService.addAmlBlocklistEntry(dto, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('aml-blocklist/:id')
  removeAmlBlocklist(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.walletsService.removeAmlBlocklistEntry(id, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('thresholds')
  listThresholds() {
    return this.walletsService.listWalletThresholds();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('thresholds')
  upsertThreshold(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(upsertWalletThresholdSchema)) dto: UpsertWalletThresholdDto
  ) {
    return this.walletsService.upsertWalletThreshold(dto, req.user);
  }

  @Post('payouts/webhook')
  webhook(@Body(new ZodValidationPipe(payoutWebhookSchema)) dto: PayoutWebhookDto) {
    return this.walletsService.handleWebhook(dto);
  }
}
