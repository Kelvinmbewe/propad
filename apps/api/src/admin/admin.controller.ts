import { Body, Controller, Get, Header, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Role } from '@propad/config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AdminService } from './admin.service';
import { CreateStrikeDto, createStrikeSchema } from './dto/create-strike.dto';
import { UpdateFeatureFlagDto, updateFeatureFlagSchema } from './dto/update-feature-flag.dto';
import { ListInvoicesDto, listInvoicesSchema } from './dto/list-invoices.dto';
import { MarkInvoicePaidDto, markInvoicePaidSchema } from './dto/mark-invoice-paid.dto';
import { ListPaymentIntentsDto, listPaymentIntentsSchema } from './dto/list-payment-intents.dto';
import { ListTransactionsDto, listTransactionsSchema } from './dto/list-transactions.dto';
import { CreateFxRateDto, createFxRateSchema } from './dto/create-fx-rate.dto';
import { UpdateAppConfigDto, updateAppConfigSchema } from './dto/update-app-config.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
  };
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  @Post('strikes')
  createStrike(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createStrikeSchema)) dto: CreateStrikeDto
  ) {
    return this.adminService.createStrike(dto, req.user.userId);
  }

  @Get('strikes')
  listStrikes(@Query('agentId') agentId?: string) {
    return this.adminService.listStrikes(agentId);
  }

  @Post('feature-flags')
  updateFeatureFlag(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(updateFeatureFlagSchema)) dto: UpdateFeatureFlagDto
  ) {
    return this.adminService.updateFeatureFlag(dto, req.user.userId);
  }

  @Get('feature-flags')
  listFeatureFlags() {
    return this.adminService.listFeatureFlags();
  }

  @Get('exports/properties')
  @Header('Content-Type', 'text/csv')
  exportProperties() {
    return this.adminService.exportPropertiesCsv();
  }

  @Get('exports/leads')
  @Header('Content-Type', 'text/csv')
  exportLeads() {
    return this.adminService.exportLeadsCsv();
  }

  @Get('analytics/summary')
  analytics() {
    return this.adminService.analyticsSummary();
  }

  @Get('invoices')
  listInvoices(@Query(new ZodValidationPipe(listInvoicesSchema)) query: ListInvoicesDto) {
    return this.adminService.listInvoices(query.status);
  }

  @Get('exports/invoices')
  @Header('Content-Type', 'text/csv')
  exportInvoices(@Query(new ZodValidationPipe(listInvoicesSchema)) query: ListInvoicesDto) {
    return this.adminService.exportInvoicesCsv(query.status);
  }

  @Get('payment-intents')
  listPaymentIntents(
    @Query(new ZodValidationPipe(listPaymentIntentsSchema)) query: ListPaymentIntentsDto
  ) {
    return this.adminService.listPaymentIntents(query);
  }

  @Get('exports/payment-intents')
  @Header('Content-Type', 'text/csv')
  exportPaymentIntents(
    @Query(new ZodValidationPipe(listPaymentIntentsSchema)) query: ListPaymentIntentsDto
  ) {
    return this.adminService.exportPaymentIntentsCsv(query);
  }

  @Get('transactions')
  listTransactions(@Query(new ZodValidationPipe(listTransactionsSchema)) query: ListTransactionsDto) {
    return this.adminService.listTransactions(query);
  }

  @Get('exports/transactions')
  @Header('Content-Type', 'text/csv')
  exportTransactions(@Query(new ZodValidationPipe(listTransactionsSchema)) query: ListTransactionsDto) {
    return this.adminService.exportTransactionsCsv(query);
  }

  @Post('invoices/:id/mark-paid')
  markInvoicePaid(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(markInvoicePaidSchema)) dto: MarkInvoicePaidDto
  ) {
    return this.adminService.markInvoicePaid(id, dto, req.user.userId);
  }

  @Post('fx-rates')
  createFxRate(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createFxRateSchema)) dto: CreateFxRateDto
  ) {
    return this.adminService.createFxRate(dto, req.user.userId);
  }

  @Get('config')
  getAppConfig() {
    return this.adminService.getAppConfig();
  }

  @Post('config')
  updateAppConfig(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(updateAppConfigSchema)) dto: UpdateAppConfigDto
  ) {
    return this.adminService.updateAppConfig(dto, req.user.userId);
  }
  @Get('users')
  listUsers(@Query('role') role?: string) {
    return this.adminService.listUsers(role);
  }

  @Get('agencies')
  listAgencies() {
    return this.adminService.listAgencies();
  }
}
