import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  Req,
  ForbiddenException,
  BadRequestException,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AgenciesService } from "./agencies.service";
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
    return this.agenciesService.getMyAgency(req.user.id);
  }

  @Get(":id")
  async getAgency(@Param("id") id: string) {
    return this.agenciesService.findOne(id);
  }

  @Patch(":id")
  @Roles(Role.ADMIN, Role.COMPANY_ADMIN)
  async updateProfile(
    @Param("id") id: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    // Enforce Ownership if not ADMIN
    if (req.user.role !== Role.ADMIN) {
      const myAgency = await this.agenciesService.getMyAgency(req.user.id);
      if (myAgency?.id !== id) throw new ForbiddenException("Not your agency");
    }
    return this.agenciesService.updateProfile(id, body, req.user.id);
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
  @Roles(Role.ADMIN, Role.COMPANY_ADMIN)
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
      const myAgency = await this.agenciesService.getMyAgency(req.user.id);
      if (myAgency?.id !== id) throw new ForbiddenException("Not your agency");
    }
    return this.agenciesService.uploadLogo(
      id,
      {
        filename: file.originalname,
        mimetype: file.mimetype,
        buffer: file.buffer,
      },
      req.user.id,
    );
  }

  @Post()
  @Roles(Role.COMPANY_ADMIN) // Or maybe USER who wants to start one? Assuming COMPANY_ADMIN for now based on Plan.
  async create(@Body() body: { name: string }, @Req() req: any) {
    return this.agenciesService.create(body.name, req.user.id);
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
