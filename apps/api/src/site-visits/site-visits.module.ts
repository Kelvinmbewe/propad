import { Module } from "@nestjs/common";
import { SiteVisitsController } from "./site-visits.controller";
import { SiteVisitsService } from "./site-visits.service";
import { PrismaModule } from "../prisma/prisma.module";
import { TrustModule } from "../trust/trust.module";
import { VerificationsModule } from "../verifications/verifications.module";

@Module({
  imports: [PrismaModule, TrustModule, VerificationsModule],
  controllers: [SiteVisitsController],
  providers: [SiteVisitsService],
  exports: [SiteVisitsService],
})
export class SiteVisitsModule {}
