import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { VerificationsController } from './verifications.controller';
import { VerificationsService } from './verifications.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [VerificationsController],
  providers: [VerificationsService]
})
export class VerificationsModule {}
