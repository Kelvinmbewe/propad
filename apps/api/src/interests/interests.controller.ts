import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Patch,
  Param,
} from "@nestjs/common";
import { InterestsService } from "./interests.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Role } from "@propad/config";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { UpdateInterestStatusDto, updateInterestStatusSchema } from "./dto/update-interest-status.dto";

import { AuthenticatedRequest } from "../auth/interfaces/authenticated-request.interface";

@Controller("interests")
@UseGuards(JwtAuthGuard, RolesGuard)
export class InterestsController {
  constructor(private readonly interestsService: InterestsService) {}

  @Post("toggle")
  @Roles(Role.USER, Role.AGENT, Role.LANDLORD, Role.ADMIN) // Anyone can save a property
  async toggleInterest(
    @Request() req: AuthenticatedRequest,
    @Body() body: { propertyId: string },
  ) {
    return this.interestsService.toggleInterest(
      req.user.userId,
      body.propertyId,
    );
  }

  @Get("my")
  @Roles(Role.USER, Role.AGENT, Role.LANDLORD, Role.ADMIN)
  async getMyInterests(@Request() req: AuthenticatedRequest) {
    return this.interestsService.getMyInterests(req.user.userId);
  }

  @Get("landlord")
  @Roles(Role.LANDLORD, Role.ADMIN)
  async getLandlordInterests(@Request() req: AuthenticatedRequest) {
    return this.interestsService.getLandlordInterests(req.user.userId);
  }

  @Patch(":id/status")
  @Roles(Role.LANDLORD, Role.AGENT, Role.ADMIN)
  async updateStatus(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(updateInterestStatusSchema)) dto: UpdateInterestStatusDto,
  ) {
    return this.interestsService.updateStatus(id, dto.status, req.user);
  }
}
