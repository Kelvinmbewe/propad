import { Body, Controller, Post } from '@nestjs/common';
import { InboundMessageDto } from './dto/inbound-message.dto';
import { WhatsAppService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Post('inbound')
  handleInbound(@Body() dto: InboundMessageDto) {
    return this.whatsappService.handleInbound(dto);
  }
}
