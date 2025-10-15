import { Module } from '@nestjs/common';
import { PropertiesModule } from '../properties/properties.module';
import { ShortLinksModule } from '../shortlinks/shortlinks.module';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';

@Module({
  imports: [PropertiesModule, ShortLinksModule],
  controllers: [WhatsAppController],
  providers: [WhatsAppService]
})
export class WhatsAppModule {}
