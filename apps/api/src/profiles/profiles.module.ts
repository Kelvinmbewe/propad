
import { Module } from '@nestjs/common';
import { ProfilesController } from './profiles.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AgenciesModule } from '../agencies/agencies.module';

@Module({
    imports: [PrismaModule, AgenciesModule],
    controllers: [ProfilesController],
})
export class ProfilesModule { }
