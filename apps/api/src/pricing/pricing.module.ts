import { Module, Global } from "@nestjs/common";
import { PricingService } from "./pricing.service";
import { PricingController } from "./pricing.controller";
import { PricingConfigController } from "./pricing-config.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditModule } from "../audit/audit.module";

@Global()
@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [PricingController, PricingConfigController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
