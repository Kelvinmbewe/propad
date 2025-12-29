import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { RewardsController } from './rewards.controller';
import { RewardsService } from './rewards.service';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
  imports: [PrismaModule, AuditModule, WalletsModule],
  controllers: [RewardsController],
  providers: [RewardsService],
  exports: [RewardsService]
})
export class RewardsModule { }
