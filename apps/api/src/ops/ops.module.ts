import { Module, Global } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';
import { OpsController } from './ops.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
    imports: [PrismaModule],
    controllers: [OpsController],
    providers: [FeatureFlagsService],
    exports: [FeatureFlagsService]
})
export class OpsModule { }
