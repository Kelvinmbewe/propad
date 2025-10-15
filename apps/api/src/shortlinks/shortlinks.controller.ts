import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateShortLinkDto } from './dto/create-shortlink.dto';
import { TrackClickDto } from './dto/track-click.dto';
import { ShortLinksService } from './shortlinks.service';

@Controller('shortlinks')
export class ShortLinksController {
  constructor(private readonly shortLinksService: ShortLinksService) {}

  @Post()
  create(@Body() dto: CreateShortLinkDto) {
    return this.shortLinksService.create(dto);
  }

  @Get(':code')
  findOne(@Param('code') code: string) {
    return this.shortLinksService.findByCode(code);
  }

  @Post(':code/click')
  registerClick(@Param('code') code: string, @Body() dto: TrackClickDto) {
    return this.shortLinksService.registerClick(code, dto);
  }
}
