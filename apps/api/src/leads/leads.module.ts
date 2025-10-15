import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [LeadsController],
  providers: [LeadsService]
})
export class LeadsModule {}
