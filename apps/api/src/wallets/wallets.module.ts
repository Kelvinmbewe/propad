import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [WalletsController],
  providers: [WalletsService],
  exports: [WalletsService]
})
export class WalletsModule {}
