import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { GeoModule } from '../geo/geo.module';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';

@Module({
  imports: [PrismaModule, AuditModule, GeoModule],
  controllers: [PropertiesController],
  providers: [PropertiesService],
  exports: [PropertiesService]
})
export class PropertiesModule {}
