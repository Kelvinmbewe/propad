import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { PropertiesModule } from '../properties/properties.module';
import { ShortLinksModule } from '../shortlinks/shortlinks.module';
import { FacebookController } from './facebook.controller';
import { FacebookService } from './facebook.service';

@Module({
  imports: [HttpModule, PropertiesModule, ShortLinksModule],
  controllers: [FacebookController],
  providers: [FacebookService],
  exports: [FacebookService]
})
export class FacebookModule { }
