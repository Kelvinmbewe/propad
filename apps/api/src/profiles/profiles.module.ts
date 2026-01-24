import { Module } from "@nestjs/common";
import { ProfilesController } from "./profiles.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { AgenciesModule } from "../agencies/agencies.module";

import { TrustModule } from "../trust/trust.module";
import { AuditModule } from "../audit/audit.module";
import { ProfilesService } from "./profiles.service";

@Module({
  imports: [PrismaModule, AgenciesModule, TrustModule, AuditModule],
  controllers: [ProfilesController],
  providers: [ProfilesService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
