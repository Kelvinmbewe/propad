import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { PromosController } from './promos.controller';
import { PromosService } from './promos.service';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PrismaModule, AuditModule, PaymentsModule],
  controllers: [PromosController],
  providers: [PromosService]
})
export class PromosModule {}
