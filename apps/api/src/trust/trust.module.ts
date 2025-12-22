
import { Module } from '@nestjs/common';
import { TrustService } from './trust.service';
import { PrismaModule } from '../prisma/prisma.module';

import { BadgesHelper } from './badges.helper';

@Module({
    imports: [PrismaModule],
    providers: [TrustService, BadgesHelper],
    exports: [TrustService, BadgesHelper],
})
export class TrustModule { }
