
import { Module } from '@nestjs/common';
import { MonetizationService } from './monetization.service';
import { MonetizationController } from './monetization.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [MonetizationController],
    providers: [MonetizationService],
    exports: [MonetizationService],
})
export class MonetizationModule { }
