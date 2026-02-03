import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  UseGuards,
  Req,
} from "@nestjs/common";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Role } from "@propad/config";
import { UsersService } from "./users.service";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { UserKycActionDto, userKycActionSchema } from "./dto/kyc-action.dto";

interface AuthenticatedRequest {
  user: {
    userId: string;
    role: Role;
    email?: string | null;
  };
}

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("users/:id")
  async getPublicUser(@Param("id") id: string) {
    return this.usersService.getPublicUser(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.VERIFIER, Role.MODERATOR)
  @Get("admin/users/:id/kyc")
  async getAdminKyc(@Param("id") id: string) {
    return this.usersService.getAdminKyc(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.VERIFIER, Role.MODERATOR)
  @Post("admin/users/:id/kyc/action")
  async applyKycAction(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(userKycActionSchema))
    dto: UserKycActionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.usersService.applyKycAction(
      id,
      dto.action,
      req.user,
      dto.notes,
    );
  }

  // Document access is handled via /admin/documents/:id/file with signed URLs.
}
