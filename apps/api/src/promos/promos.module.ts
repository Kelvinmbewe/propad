import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { PromosController } from './promos.controller';
import { PromosService } from './promos.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [PromosController],
  providers: [PromosService]
})
export class PromosModule {}
