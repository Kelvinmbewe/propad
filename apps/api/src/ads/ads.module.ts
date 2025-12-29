import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdsController } from './ads.controller';
import { AdsService } from './ads.service';
import { PaymentsModule } from '../payments/payments.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, PaymentsModule, AuditModule],
  controllers: [AdsController],
  providers: [AdsService],
  exports: [AdsService]
})
export class AdsModule { }
