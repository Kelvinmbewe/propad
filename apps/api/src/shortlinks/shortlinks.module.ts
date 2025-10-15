import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ShortLinksController } from './shortlinks.controller';
import { ShortLinksService } from './shortlinks.service';

@Module({
  imports: [PrismaModule],
  controllers: [ShortLinksController],
  providers: [ShortLinksService],
  exports: [ShortLinksService]
})
export class ShortLinksModule {}
