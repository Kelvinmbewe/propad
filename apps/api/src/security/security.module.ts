import { Module, Global } from '@nestjs/common';
import { RiskService } from './risk.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SecurityController } from './security.controller';

@Global()
@Module({
    imports: [PrismaModule],
    controllers: [SecurityController],
    providers: [RiskService],
    exports: [RiskService]
})
export class SecurityModule { }
