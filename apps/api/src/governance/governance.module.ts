import { Module } from '@nestjs/common';
import { GovernanceService } from './governance.service';
import { GovernanceGuard } from './governance.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
    imports: [PrismaModule, AuditModule],
    providers: [GovernanceService, GovernanceGuard],
    exports: [GovernanceService, GovernanceGuard],
})
export class GovernanceModule { }
