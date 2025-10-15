import { Body, Controller, Post } from '@nestjs/common';
import { PublishRequestDto } from './dto/publish-request.dto';
import { FacebookService } from './facebook.service';

@Controller('facebook')
export class FacebookController {
  constructor(private readonly facebookService: FacebookService) {}

  @Post('publish')
  publish(@Body() dto: PublishRequestDto) {
    return this.facebookService.publish(dto);
  }
}
