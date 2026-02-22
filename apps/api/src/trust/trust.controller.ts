import { Controller, Get, UseGuards, Req } from "@nestjs/common";
import { TrustService } from "./trust.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Logger } from "@nestjs/common";
import { Request } from "express";

@Controller("trust")
@UseGuards(JwtAuthGuard)
export class TrustController {
  private readonly logger = new Logger(TrustController.name);

  constructor(private readonly trustService: TrustService) {}

  @Get("score")
  async getMyTrustScore(@Req() req: any) {
    const userId = req.user?.userId ?? req.user?.id;
    if (!userId) {
      return { score: 0 };
    }

    try {
      const score = await this.trustService.calculateUserTrust(userId);
      return { score };
    } catch (error) {
      this.logger.warn("Trust score calculation failed", error as any);
      return { score: 0 };
    }
  }
}
