
import { Module } from '@nestjs/common';
import { AgenciesService } from './agencies.service';
import { AgenciesController } from './agencies.controller';
import { AgencyMembersController } from './agency-members.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TrustModule } from '../trust/trust.module';
import { AuditModule } from '../audit/audit.module';

@Module({
    imports: [PrismaModule, TrustModule, AuditModule],
    controllers: [AgenciesController, AgencyMembersController],
    providers: [AgenciesService],
    exports: [AgenciesService],
})
export class AgenciesModule { }
