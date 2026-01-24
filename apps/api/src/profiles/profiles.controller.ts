import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Role } from "@propad/config";
import { ProfilesService } from "./profiles.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Patch, Body } from "@nestjs/common";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import {
  UpdateUserProfileDto,
  updateUserProfileSchema,
} from "./dto/update-user-profile.dto";

@Controller("profiles")
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get("users/:id")
  async getUserProfile(@Param("id") id: string) {
    return this.profilesService.getPublicUserProfile(id);
  }

  @Get("companies/:id")
  async getAgencyProfile(@Param("id") id: string) {
    // Changed route to :id for consistency, or keep as slug if preferred.
    // Service expects ID. If slug is needed, service should change.
    // Assuming ID for now as per plan, but route said slug previously.
    // Let's stick to ID for this phase to match service.
    return this.profilesService.getPublicAgencyProfile(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.AGENT, Role.LANDLORD, Role.COMPANY_ADMIN)
  @Post("me/photo")
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
  async uploadProfilePhoto(
    @UploadedFile()
    file: { originalname: string; mimetype: string; buffer: Buffer },
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException("No file provided");
    }
    return this.profilesService.updateUserPhoto(req.user.id, {
      filename: file.originalname,
      mimetype: file.mimetype,
      buffer: file.buffer,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.AGENT, Role.LANDLORD, Role.COMPANY_ADMIN)
  @Get("me")
  async getMyProfile(@Req() req: any) {
    return this.profilesService.getMyProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.AGENT, Role.LANDLORD, Role.COMPANY_ADMIN)
  @Patch("me")
  async updateProfile(
    @Req() req: any,
    @Body(new ZodValidationPipe(updateUserProfileSchema))
    body: UpdateUserProfileDto,
  ) {
    return this.profilesService.updateUserProfile(req.user.id, body);
  }
}
