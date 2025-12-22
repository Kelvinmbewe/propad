
import { Module } from '@nestjs/common';
import { TrustService } from './trust.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [TrustService],
    exports: [TrustService],
})
export class TrustModule { }
