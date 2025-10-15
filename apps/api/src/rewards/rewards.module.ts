import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { RewardsController } from './rewards.controller';
import { RewardsService } from './rewards.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [RewardsController],
  providers: [RewardsService]
})
export class RewardsModule {}
