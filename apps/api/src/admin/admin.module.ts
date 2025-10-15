import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PrismaModule, AuditModule, PaymentsModule],
  controllers: [AdminController],
  providers: [AdminService]
})
export class AdminModule {}
