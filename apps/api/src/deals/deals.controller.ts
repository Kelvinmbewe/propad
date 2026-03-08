import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { DealsService } from "./deals.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthContext } from "../auth/interfaces/auth-context.interface";
import { FileInterceptor } from "@nestjs/platform-express";

interface AuthenticatedRequest {
  user: AuthContext;
}

@Controller("deals")
@UseGuards(JwtAuthGuard)
export class DealsController {
  constructor(private readonly service: DealsService) {}

  @Get("my")
  getMyDeals(@Req() req: AuthenticatedRequest) {
    return this.service.findMyDeals(req.user.userId);
  }

  @Get("queue")
  getDealsQueue(
    @Req() req: AuthenticatedRequest,
    @Query("q") q?: string,
    @Query("stage") stage?: string,
    @Query("take") take?: string,
  ) {
    return this.service.findMyDealsQueue(req.user.userId, {
      q,
      stage,
      take: take ? Number(take) : undefined,
    });
  }

  @Get("application/:applicationId")
  getDealByApplication(
    @Param("applicationId") applicationId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.findByApplication(applicationId, req.user.userId);
  }

  @Post("application/:applicationId/create")
  createFromApplication(
    @Param("applicationId") applicationId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.createOrGetFromApplication(
      applicationId,
      req.user.userId,
    );
  }

  @Patch(":id/workflow")
  updateWorkflow(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      stage?: "ACTIVE" | "COMPLETED" | "CANCELLED";
      terms?: Record<string, unknown>;
      dealType?: "RENT" | "SALE";
    },
  ) {
    return this.service.updateWorkflow(id, req.user.userId, body);
  }

  @Patch(":id/terms")
  updateTerms(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
    @Body() terms: Record<string, unknown>,
  ) {
    return this.service.saveDealTerms(id, req.user.userId, terms);
  }

  @Post(":id/contract/generate")
  generateContract(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.service.generateContract(id, req.user.userId);
  }

  @Post(":id/contract/create-version")
  createContractVersion(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      snapshotFormat?: "HTML" | "MARKDOWN";
      snapshotText: string;
    },
  ) {
    return this.service.createContractVersion(id, req.user.userId, body);
  }

  @Post(":id/contract/send")
  sendContract(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: { versionId?: string },
  ) {
    return this.service.sendContract(id, req.user.userId, body.versionId);
  }

  @Post(":id/approve")
  approveDeal(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.service.approveDeal(id, req.user.userId);
  }

  @Post(":id/activate")
  activateDeal(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.service.activateDeal(id, req.user.userId);
  }

  @Post(":id/reject")
  rejectDeal(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: { reason?: string },
  ) {
    return this.service.rejectDeal(id, req.user.userId, body.reason);
  }

  @Post(":id/sign")
  signDeal(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: { fullName: string; agreed: boolean },
  ) {
    return this.service.signDeal(id, req.user.userId, body);
  }

  @Get(":id/contract")
  getContract(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.service.findContract(id, req.user.userId);
  }

  @Post(":id/contract/upload")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 15 * 1024 * 1024 },
      fileFilter: (request, file, callback) => {
        const allowed = ["application/pdf", "image/png", "image/jpeg"];
        if (allowed.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new Error("Only PDF, PNG, and JPEG files are allowed"),
            false,
          );
        }
      },
    }),
  )
  uploadContract(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
    @UploadedFile()
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
  ) {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }
    return this.service.uploadContractFile(id, req.user.userId, req.user.role, {
      filename: file.originalname,
      mimetype: file.mimetype,
      sizeBytes: file.size,
      buffer: file.buffer,
    });
  }

  @Post(":id/contract/seal")
  sealContract(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: { method?: "ESIGN" | "UPLOAD" },
  ) {
    return this.service.sealDeal(
      id,
      req.user.userId,
      req.user.role,
      body.method,
    );
  }

  @Get(":id")
  getDeal(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.service.findOne(id, req.user.userId);
  }
}
