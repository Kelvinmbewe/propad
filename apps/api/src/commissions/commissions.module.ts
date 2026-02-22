import { Module } from '@nestjs/common';
import { CommissionsService } from './commissions.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
    imports: [PrismaModule, WalletsModule],
    providers: [CommissionsService],
    exports: [CommissionsService],
})
export class CommissionsModule { }
