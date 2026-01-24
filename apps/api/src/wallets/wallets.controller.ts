import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Role } from "@propad/config";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { WalletsService } from "./wallets.service";
import {
  requestPayoutSchema,
  RequestPayoutDto,
} from "./dto/request-payout.dto";
import {
  approvePayoutSchema,
  ApprovePayoutDto,
} from "./dto/approve-payout.dto";
import {
  payoutWebhookSchema,
  PayoutWebhookDto,
} from "./dto/payout-webhook.dto";
import {
  createPayoutAccountSchema,
  CreatePayoutAccountDto,
} from "./dto/create-payout-account.dto";
import { submitKycSchema, SubmitKycDto } from "./dto/submit-kyc.dto";
import {
  updateKycStatusSchema,
  UpdateKycStatusDto,
} from "./dto/update-kyc-status.dto";
import {
  verifyPayoutAccountSchema,
  VerifyPayoutAccountDto,
} from "./dto/verify-payout-account.dto";
import {
  listKycRecordsSchema,
  type ListKycRecordsDto,
} from "./dto/list-kyc-records.dto";
import {
  listPayoutRequestsSchema,
  type ListPayoutRequestsDto,
} from "./dto/list-payout-requests.dto";
import {
  listPayoutAccountsSchema,
  type ListPayoutAccountsDto,
} from "./dto/list-payout-accounts.dto";
import {
  manageAmlBlocklistSchema,
  type ManageAmlBlocklistDto,
} from "./dto/manage-aml-blocklist.dto";
import {
  upsertWalletThresholdSchema,
  type UpsertWalletThresholdDto,
} from "./dto/upsert-wallet-threshold.dto";

interface AuthenticatedRequest {
  user: {
    userId: string;
    role: Role;
  };
}

@Controller("wallets")
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT, Role.LANDLORD, Role.USER)
  @Get("me")
  me(@Req() req: AuthenticatedRequest) {
    return this.walletsService.getMyWallet(req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT, Role.ADMIN)
  @Get(":id/transactions")
  transactions(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.walletsService.listTransactions(id, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT, Role.LANDLORD, Role.USER)
  @Post("payout-accounts")
  createAccount(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createPayoutAccountSchema))
    dto: CreatePayoutAccountDto,
  ) {
    return this.walletsService.createPayoutAccount(dto, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get("payout-accounts")
  listPayoutAccounts(
    @Query(new ZodValidationPipe(listPayoutAccountsSchema))
    query: ListPayoutAccountsDto,
  ) {
    return this.walletsService.listPayoutAccounts(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post("payout-accounts/:id/verify")
  verifyAccount(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(verifyPayoutAccountSchema))
    dto: VerifyPayoutAccountDto,
  ) {
    return this.walletsService.verifyPayoutAccount(id, dto, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT, Role.LANDLORD, Role.USER)
  @Post("kyc")
  submitKyc(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(submitKycSchema)) dto: SubmitKycDto,
  ) {
    return this.walletsService.submitKyc(dto, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT, Role.LANDLORD, Role.USER)
  @Get("kyc/history")
  listMyKycHistory(@Req() req: AuthenticatedRequest) {
    return this.walletsService.listMyKycRecords(req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT, Role.LANDLORD, Role.USER)
  @Post("kyc/upload")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          "image/jpeg",
          "image/png",
          "image/webp",
          "application/pdf",
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new Error("Only JPEG, PNG, WebP, and PDF documents are allowed"),
            false,
          );
        }
      },
    }),
  )
  uploadKycDocument(
    @UploadedFile()
    file: { originalname: string; mimetype: string; buffer: Buffer },
    @Req() req: AuthenticatedRequest,
  ) {
    if (!file) {
      throw new BadRequestException("No file provided");
    }
    return this.walletsService.uploadKycDocument(
      {
        filename: file.originalname,
        mimetype: file.mimetype,
        buffer: file.buffer,
      },
      req.user,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COMPANY_ADMIN, Role.AGENT, Role.LANDLORD)
  @Post("kyc/agency/:agencyId")
  submitAgencyKyc(
    @Param("agencyId") agencyId: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(submitKycSchema)) dto: SubmitKycDto,
  ) {
    return this.walletsService.submitAgencyKyc(agencyId, dto, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COMPANY_ADMIN, Role.AGENT, Role.LANDLORD)
  @Get("kyc/agency/:agencyId/history")
  listAgencyKycHistory(
    @Param("agencyId") agencyId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.walletsService.listAgencyKycRecords(agencyId, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COMPANY_ADMIN, Role.AGENT, Role.LANDLORD)
  @Post("kyc/agency/:agencyId/upload")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          "image/jpeg",
          "image/png",
          "image/webp",
          "application/pdf",
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new Error("Only JPEG, PNG, WebP, and PDF documents are allowed"),
            false,
          );
        }
      },
    }),
  )
  uploadAgencyKycDocument(
    @Param("agencyId") agencyId: string,
    @UploadedFile()
    file: { originalname: string; mimetype: string; buffer: Buffer },
    @Req() req: AuthenticatedRequest,
  ) {
    if (!file) {
      throw new BadRequestException("No file provided");
    }
    return this.walletsService.uploadAgencyKycDocument(
      agencyId,
      {
        filename: file.originalname,
        mimetype: file.mimetype,
        buffer: file.buffer,
      },
      req.user,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get("kyc")
  listKyc(
    @Query(new ZodValidationPipe(listKycRecordsSchema))
    query: ListKycRecordsDto,
  ) {
    return this.walletsService.listKycRecords(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post("kyc/:id/status")
  updateKycStatus(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(updateKycStatusSchema)) dto: UpdateKycStatusDto,
  ) {
    return this.walletsService.updateKycStatus(id, dto, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT)
  @Post("payouts")
  requestPayout(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(requestPayoutSchema)) dto: RequestPayoutDto,
  ) {
    return this.walletsService.requestPayout(dto, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get("payouts")
  listPayouts(
    @Query(new ZodValidationPipe(listPayoutRequestsSchema))
    query: ListPayoutRequestsDto,
  ) {
    return this.walletsService.listPayoutRequests(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post("payouts/:id/approve")
  approvePayout(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(approvePayoutSchema)) dto: ApprovePayoutDto,
  ) {
    return this.walletsService.approvePayout(id, dto, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get("aml-blocklist")
  listAmlBlocklist() {
    return this.walletsService.listAmlBlocklist();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post("aml-blocklist")
  addAmlBlocklist(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(manageAmlBlocklistSchema))
    dto: ManageAmlBlocklistDto,
  ) {
    return this.walletsService.addAmlBlocklistEntry(dto, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete("aml-blocklist/:id")
  removeAmlBlocklist(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.walletsService.removeAmlBlocklistEntry(id, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get("thresholds")
  listThresholds() {
    return this.walletsService.listWalletThresholds();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post("thresholds")
  upsertThreshold(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(upsertWalletThresholdSchema))
    dto: UpsertWalletThresholdDto,
  ) {
    return this.walletsService.upsertWalletThreshold(dto, req.user);
  }

  @Post("payouts/webhook")
  webhook(
    @Body(new ZodValidationPipe(payoutWebhookSchema)) dto: PayoutWebhookDto,
  ) {
    return this.walletsService.handleWebhook(dto);
  }
}
