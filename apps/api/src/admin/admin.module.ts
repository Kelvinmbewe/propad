import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { PaymentsModule } from '../payments/payments.module';
import { AppConfigModule } from '../app-config/app-config.module';
import { AdsModule } from '../ads/ads.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [PrismaModule, AuditModule, PaymentsModule, AppConfigModule, AdsModule],
  controllers: [AdminController],
  providers: [AdminService]
})
export class AdminModule { }
