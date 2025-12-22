
import { Module } from '@nestjs/common';
import { TrustService } from './trust.service';
import { PrismaModule } from '../prisma/prisma.module';

import { BadgesHelper } from './badges.helper';
import { RiskService } from './risk.service';
import { RiskController } from './risk.controller';

@Module({
    imports: [PrismaModule],
    controllers: [RiskController],
    providers: [TrustService, BadgesHelper, RiskService],
    exports: [TrustService, BadgesHelper, RiskService],
})
export class TrustModule { }
