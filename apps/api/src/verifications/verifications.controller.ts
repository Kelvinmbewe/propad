import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { VerificationsService } from "./verifications.service";
import { VerificationType } from "@prisma/client";
import { Role } from "@propad/config";
import { PaginationDto } from "../common/pagination.dto";
import { Post } from "@nestjs/common"; // Added Post
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ReviewVerificationItemDto } from "../properties/dto/review-verification-item.dto";

interface AuthenticatedRequest {
  user: {
    userId: string;
    role: Role;
  };
}

@Controller("verifications")
export class VerificationsController {
  private readonly logger = new Logger(VerificationsController.name);

  constructor(private readonly verificationsService: VerificationsService) {}

  @Get("queue")
  async getQueue() {
    try {
      return await this.verificationsService.getVerificationQueue();
    } catch (error) {
      this.logger.error("Failed to get verification queue", error);
      return [];
    }
  }

  @Get()
  async listRequests(
    @Query("targetType") targetType?: VerificationType,
    @Query("status") status?: string,
    @Query() pagination?: PaginationDto,
  ) {
    // Basic filter implementation request
    // In real app, would use comprehensive filter DTO
    return this.verificationsService.findAllRequests({
      targetType,
      status,
      ...pagination,
    });
  }

  @Get("requests/:id")
  async getRequest(@Param("id") id: string) {
    return this.verificationsService.getRequest(id);
  }

  @Patch("requests/:requestId/items/:itemId")
  @UseGuards(JwtAuthGuard)
  async reviewItem(
    @Param("requestId") requestId: string,
    @Param("itemId") itemId: string,
    @Body() body: ReviewVerificationItemDto,
    @Req() req: AuthenticatedRequest,
  ) {
    // Extract verifierId strictly from req.user.id (guaranteed to exist in database via JWT strategy auto-sync)
    const actor = { userId: req.user.userId };
    return this.verificationsService.reviewItem(requestId, itemId, body, actor);
  }
  @Get("my")
  @UseGuards(JwtAuthGuard)
  async getMyRequests(@Req() req: AuthenticatedRequest) {
    return this.verificationsService.getMyRequests(req.user.userId);
  }

  @Post("properties/:propertyId/refresh")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LANDLORD, Role.AGENT, Role.ADMIN)
  async refreshPropertyVerification(@Param("propertyId") propertyId: string) {
    return this.verificationsService.refreshPropertyVerification(propertyId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async submitRequest(
    @Body()
    body: { targetType: VerificationType; targetId: string; items: any[] },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.verificationsService.createRequest(req.user.userId, body);
  }

  @Patch("requests/:id/assign")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async assignVerifier(
    @Param("id") id: string,
    @Body() body: { verifierId: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.verificationsService.assignVerifierToRequest(
      id,
      body.verifierId,
      req.user.userId,
    );
  }

  @Patch("requests/:id/decision")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.VERIFIER) // Assuming VERIFIER role exists, or just ADMIN
  async decideRequest(
    @Param("id") id: string,
    @Body() body: { status: "APPROVED" | "REJECTED"; notes: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.verificationsService.decideRequest(
      id,
      body.status,
      body.notes,
      req.user.userId,
    );
  }
}
