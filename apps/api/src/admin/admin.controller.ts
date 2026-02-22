import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Patch,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Role } from "@propad/config";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { AdminService } from "./admin.service";
import { AdsService } from "../ads/ads.service";
import { CreateStrikeDto, createStrikeSchema } from "./dto/create-strike.dto";
import {
  UpdateFeatureFlagDto,
  updateFeatureFlagSchema,
} from "./dto/update-feature-flag.dto";
import { ListInvoicesDto, listInvoicesSchema } from "./dto/list-invoices.dto";
import {
  ListPaymentIntentsDto,
  listPaymentIntentsSchema,
} from "./dto/list-payment-intents.dto";
import {
  ListTransactionsDto,
  listTransactionsSchema,
} from "./dto/list-transactions.dto";
import {
  MarkInvoicePaidDto,
  markInvoicePaidSchema,
} from "./dto/mark-invoice-paid.dto";
import { CreateFxRateDto, createFxRateSchema } from "./dto/create-fx-rate.dto";
import {
  UpdateAppConfigDto,
  updateAppConfigSchema,
} from "./dto/update-app-config.dto";
import {
  CreateAdminUserDto,
  createAdminUserSchema,
} from "./dto/create-admin-user.dto";
import {
  UpdateAdminUserDto,
  updateAdminUserSchema,
} from "./dto/update-admin-user.dto";
import {
  UpdateAdminUserStatusDto,
  updateAdminUserStatusSchema,
} from "./dto/update-admin-user-status.dto";
import {
  DeleteAdminUserDto,
  deleteAdminUserSchema,
} from "./dto/delete-admin-user.dto";
import {
  CreateAdminAgencyDto,
  createAdminAgencySchema,
} from "./dto/create-admin-agency.dto";

interface AuthenticatedRequest {
  user: {
    userId: string;
    role: Role;
    email?: string | null;
  };
}

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly adsService: AdsService,
  ) {}

  @Get("ads/analytics")
  async getGlobalAdsAnalytics() {
    return this.adsService.getGlobalAdsAnalytics();
  }

  @Post("strikes")
  createStrike(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createStrikeSchema)) dto: CreateStrikeDto,
  ) {
    return this.adminService.createStrike(dto, req.user.userId);
  }

  @Get("strikes")
  listStrikes(@Query("agentId") agentId?: string) {
    return this.adminService.listStrikes(agentId);
  }

  @Post("feature-flags")
  updateFeatureFlag(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(updateFeatureFlagSchema))
    dto: UpdateFeatureFlagDto,
  ) {
    return this.adminService.updateFeatureFlag(dto, req.user.userId);
  }

  @Post("backup")
  triggerBackup(@Req() req: AuthenticatedRequest) {
    return this.adminService.triggerManualBackup(req.user.userId);
  }

  @Get("feature-flags")
  listFeatureFlags() {
    return this.adminService.listFeatureFlags();
  }

  @Get("exports/properties")
  @Header("Content-Type", "text/csv")
  exportProperties() {
    return this.adminService.exportPropertiesCsv();
  }

  @Get("exports/leads")
  @Header("Content-Type", "text/csv")
  exportLeads() {
    return this.adminService.exportLeadsCsv();
  }

  @Get("analytics/summary")
  analytics() {
    return this.adminService.analyticsSummary();
  }

  @Get("invoices")
  listInvoices(
    @Query(new ZodValidationPipe(listInvoicesSchema)) query: ListInvoicesDto,
  ) {
    return this.adminService.listInvoices(query.status);
  }

  @Get("exports/invoices")
  @Header("Content-Type", "text/csv")
  exportInvoices(
    @Query(new ZodValidationPipe(listInvoicesSchema)) query: ListInvoicesDto,
  ) {
    return this.adminService.exportInvoicesCsv(query.status);
  }

  @Get("payment-intents")
  listPaymentIntents(
    @Query(new ZodValidationPipe(listPaymentIntentsSchema))
    query: ListPaymentIntentsDto,
  ) {
    return this.adminService.listPaymentIntents(query);
  }

  @Get("exports/payment-intents")
  @Header("Content-Type", "text/csv")
  exportPaymentIntents(
    @Query(new ZodValidationPipe(listPaymentIntentsSchema))
    query: ListPaymentIntentsDto,
  ) {
    return this.adminService.exportPaymentIntentsCsv(query);
  }

  @Get("transactions")
  listTransactions(
    @Query(new ZodValidationPipe(listTransactionsSchema))
    query: ListTransactionsDto,
  ) {
    return this.adminService.listTransactions(query);
  }

  @Get("exports/transactions")
  @Header("Content-Type", "text/csv")
  exportTransactions(
    @Query(new ZodValidationPipe(listTransactionsSchema))
    query: ListTransactionsDto,
  ) {
    return this.adminService.exportTransactionsCsv(query);
  }

  @Post("invoices/:id/mark-paid")
  markInvoicePaid(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(markInvoicePaidSchema)) dto: MarkInvoicePaidDto,
  ) {
    return this.adminService.markInvoicePaid(id, dto, req.user.userId);
  }

  @Post("fx-rates")
  createFxRate(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createFxRateSchema)) dto: CreateFxRateDto,
  ) {
    return this.adminService.createFxRate(dto, req.user.userId);
  }

  @Get("config")
  getAppConfig() {
    return this.adminService.getAppConfig();
  }

  @Post("config")
  updateAppConfig(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(updateAppConfigSchema)) dto: UpdateAppConfigDto,
  ) {
    return this.adminService.updateAppConfig(dto, req.user.userId);
  }
  @Get("users")
  listUsers(@Query("role") role?: string) {
    return this.adminService.listUsers(role);
  }

  @Post("users")
  createUser(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createAdminUserSchema)) dto: CreateAdminUserDto,
  ) {
    return this.adminService.createUser(dto, req.user.userId);
  }

  @Patch("users/:id")
  updateUser(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(updateAdminUserSchema)) dto: UpdateAdminUserDto,
  ) {
    return this.adminService.updateUser(id, dto, req.user.userId);
  }

  @Patch("users/:id/status")
  updateUserStatus(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(updateAdminUserStatusSchema))
    dto: UpdateAdminUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(id, dto, req.user.userId);
  }

  @Delete("users/:id")
  removeUser(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(deleteAdminUserSchema))
    dto: DeleteAdminUserDto,
  ) {
    return this.adminService.removeUser(id, dto, req.user.userId);
  }

  @Get("agencies")
  listAgencies() {
    return this.adminService.listAgencies();
  }

  @Post("agencies")
  createAgency(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createAdminAgencySchema))
    dto: CreateAdminAgencyDto,
  ) {
    return this.adminService.createAgency(dto, req.user.userId);
  }

  @Get("audit-logs")
  listAuditLogs() {
    return this.adminService.listAuditLogs();
  }
}
