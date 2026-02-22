import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { DealsService } from "./deals.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthContext } from "../auth/interfaces/auth-context.interface";

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
      stage?:
        | "DRAFT"
        | "CONTRACT_SENT"
        | "SIGNED"
        | "ACTIVE"
        | "COMPLETED"
        | "CANCELLED";
      contractHtml?: string;
      terms?: Record<string, unknown>;
      dealType?: "RENT" | "SALE";
    },
  ) {
    return this.service.updateWorkflow(id, req.user.userId, body);
  }

  @Post(":id/sign")
  signDeal(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: { fullName: string; agreed: boolean },
  ) {
    return this.service.signDeal(id, req.user.userId, body);
  }

  @Get(":id")
  getDeal(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.service.findOne(id, req.user.userId);
  }
}
