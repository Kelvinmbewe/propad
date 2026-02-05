import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
  BadRequestException,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AgenciesService } from "./agencies.service";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import {
  UpdateAgencyProfileDto,
  updateAgencyProfileSchema,
} from "./dto/update-agency-profile.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role, AgencyStatus } from "@propad/config";

@Controller("agencies")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AgenciesController {
  constructor(private readonly agenciesService: AgenciesService) {}

  @Get("my")
  async getMyAgency(@Req() req: any) {
    return this.agenciesService.getMyAgency(req.user.userId);
  }

  @Get("search")
  @Roles(Role.ADMIN, Role.LANDLORD, Role.AGENT, Role.COMPANY_ADMIN)
  async searchAgencies(@Query("q") query?: string) {
    return this.agenciesService.searchAgencies(query ?? "");
  }

  @Get(":id")
  async getAgency(@Param("id") id: string) {
    return this.agenciesService.findOne(id);
  }

  @Patch(":id")
  @Roles(Role.ADMIN, Role.COMPANY_ADMIN, Role.AGENT, Role.LANDLORD)
  async updateProfile(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateAgencyProfileSchema))
    body: UpdateAgencyProfileDto,
    @Req() req: any,
  ) {
    // Enforce Ownership if not ADMIN
    if (req.user.role !== Role.ADMIN) {
      const myAgency = await this.agenciesService.getMyAgency(req.user.userId);
      if (myAgency?.id !== id) throw new ForbiddenException("Not your agency");
    }
    return this.agenciesService.updateProfile(id, body, req.user.userId);
  }

  @Patch(":id/status")
  @Roles(Role.ADMIN)
  async updateStatus(
    @Param("id") id: string,
    @Body() body: { status: AgencyStatus; reason?: string },
    @Req() req: any,
  ) {
    return this.agenciesService.updateStatus(
      id,
      body.status,
      req.user.id,
      body.reason,
    );
  }

  @Post(":id/logo")
  @Roles(Role.ADMIN, Role.COMPANY_ADMIN, Role.AGENT, Role.LANDLORD)
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowedMimes = ["image/jpeg", "image/png", "image/webp"];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error("Only JPEG, PNG, and WebP images are allowed"), false);
        }
      },
    }),
  )
  async uploadLogo(
    @Param("id") id: string,
    @UploadedFile()
    file: { originalname: string; mimetype: string; buffer: Buffer },
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException("No file provided");
    }
    if (req.user.role !== Role.ADMIN) {
      const myAgency = await this.agenciesService.getMyAgency(req.user.userId);
      if (myAgency?.id !== id) throw new ForbiddenException("Not your agency");
    }
    return this.agenciesService.uploadLogo(
      id,
      {
        filename: file.originalname,
        mimetype: file.mimetype,
        buffer: file.buffer,
      },
      req.user.userId,
    );
  }

  @Post()
  @Roles(Role.COMPANY_ADMIN, Role.ADMIN, Role.AGENT, Role.INDEPENDENT_AGENT)
  async create(
    @Body()
    body: {
      name: string;
      phone?: string;
      address?: string;
      registrationNumber?: string;
    },
    @Req() req: any,
  ) {
    const agency = await this.agenciesService.create(
      body.name,
      req.user.userId,
    );
    if (body.phone || body.address || body.registrationNumber) {
      await this.agenciesService.updateProfile(
        agency.id,
        {
          phone: body.phone,
          address: body.address,
          registrationNumber: body.registrationNumber,
        } as any,
        req.user.userId,
      );
    }
    return agency;
  }

  @Post(":id/reviews")
  @Roles(Role.USER, Role.AGENT, Role.LANDLORD)
  async addReview(
    @Param("id") id: string,
    @Body() body: { rating: number; comment?: string },
    @Req() req: any,
  ) {
    return this.agenciesService.addReview(
      id,
      req.user.id,
      body.rating,
      body.comment,
    );
  }
}
