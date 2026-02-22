import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Role } from "@propad/config";
import { PricingService } from "./pricing.service";

@Controller("pricing-config")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.LANDLORD, Role.AGENT, Role.ADMIN)
export class PricingConfigController {
  constructor(private readonly pricing: PricingService) {}

  @Get(":key")
  async getConfig(@Param("key") key: string) {
    return this.pricing.getConfig(key, null);
  }
}
