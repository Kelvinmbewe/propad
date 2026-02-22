import { Module } from '@nestjs/common';
import { InterestsController } from './interests.controller';
import { InterestsService } from './interests.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
    controllers: [InterestsController],
    providers: [InterestsService, PrismaService],
    exports: [InterestsService],
})
export class InterestsModule { }
