import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  UseGuards,
  Req,
  Query,
  Res,
} from "@nestjs/common";
import { Response } from "express";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Role } from "@propad/config";
import { CompaniesService } from "./companies.service";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import {
  CompanyKycActionDto,
  companyKycActionSchema,
} from "./dto/kyc-action.dto";
import {
  DocumentVerifyDto,
  documentVerifySchema,
} from "./dto/document-verify.dto";

interface AuthenticatedRequest {
  user: {
    userId: string;
    role: Role;
    email?: string | null;
  };
}

@Controller()
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get("companies/:id")
  async getCompany(@Param("id") id: string) {
    return this.companiesService.getPublicCompany(id);
  }

  @Get("companies/:id/summary")
  async getCompanySummary(@Param("id") id: string) {
    return this.companiesService.getCompanySummary(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.VERIFIER, Role.MODERATOR)
  @Get("admin/companies/:id/kyc")
  async getCompanyKyc(@Param("id") id: string) {
    return this.companiesService.getAdminKyc(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.VERIFIER, Role.MODERATOR)
  @Post("admin/companies/:id/kyc/action")
  async applyKycAction(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(companyKycActionSchema))
    dto: CompanyKycActionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.companiesService.applyKycAction(
      id,
      dto.action,
      req.user,
      dto.notes,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.VERIFIER, Role.MODERATOR)
  @Post("admin/documents/:id/verify")
  async verifyDocument(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(documentVerifySchema))
    dto: DocumentVerifyDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.companiesService.verifyDocument(
      id,
      dto.status,
      req.user,
      dto.notes,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.VERIFIER, Role.MODERATOR)
  @Get("admin/documents/:id/signed")
  async getSignedDocumentUrl(@Param("id") id: string) {
    return this.companiesService.generateSignedDocumentUrl(id);
  }

  @Get("admin/documents/:id/file")
  async getDocumentFile(
    @Param("id") id: string,
    @Query("expires") expires: string,
    @Query("signature") signature: string,
    @Res() res: Response,
  ) {
    this.companiesService.verifySignedDocumentToken(id, expires, signature);
    const { filePath } = await this.companiesService.getDocumentFile(id);
    return res.sendFile(filePath);
  }
}
