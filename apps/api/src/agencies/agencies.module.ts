
import { Module } from '@nestjs/common';
import { AgenciesService } from './agencies.service';
import { AgenciesController } from './agencies.controller';
import { TrustModule } from '../trust/trust.module';
import { PrismaModule } from '../prisma/prisma.module';

import { PaymentsModule } from '../payments/payments.module';

@Module({
    imports: [PrismaModule, TrustModule, PaymentsModule],
    controllers: [AgenciesController],
    providers: [AgenciesService],
    exports: [AgenciesService],
})
export class AgenciesModule { }
