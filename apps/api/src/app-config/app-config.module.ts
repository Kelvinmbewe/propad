import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AppConfigService } from './app-config.service';

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [AppConfigService],
  exports: [AppConfigService]
})
export class AppConfigModule {}

