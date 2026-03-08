import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Role } from "@propad/config";
import { VerificationPricingKey } from "@prisma/client";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { VerificationBillingService } from "./verification-billing.service";

interface AuthenticatedRequest {
  user: {
    userId: string;
  };
}

@Controller("verifications/billing")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class VerificationBillingController {
  constructor(private readonly billing: VerificationBillingService) {}

  @Get("pricing")
  listPricing() {
    return this.billing.listPricing();
  }

  @Put("pricing/:key")
  upsertPricing(
    @Param("key") key: string,
    @Body()
    body: {
      amountCents: number;
      currency?: string;
      isActive?: boolean;
      description?: string;
    },
    @Req() req: AuthenticatedRequest,
  ) {
    const normalizedKey = String(key || "")
      .trim()
      .toUpperCase();
    if (!(normalizedKey in VerificationPricingKey)) {
      throw new BadRequestException("Invalid verification pricing key");
    }

    if (!Number.isFinite(body.amountCents) || body.amountCents < 0) {
      throw new BadRequestException("amountCents must be 0 or greater");
    }

    return this.billing.upsertPricing(
      {
        key: VerificationPricingKey[
          normalizedKey as keyof typeof VerificationPricingKey
        ],
        amountCents: Math.round(body.amountCents),
        currency: body.currency,
        isActive: body.isActive,
        description: body.description,
      },
      req.user.userId,
    );
  }
}
