
import { Module } from '@nestjs/common';
import { AgenciesService } from './agencies.service';
import { AgenciesController } from './agencies.controller';
import { TrustModule } from '../trust/trust.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule, TrustModule],
    controllers: [AgenciesController],
    providers: [AgenciesService],
    exports: [AgenciesService],
})
export class AgenciesModule { }
