import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AdsService } from './ads.service';
import { CreateAdImpressionDto } from './dto/create-ad-impression.dto';
import { CreateDirectAdDto, createDirectAdSchema } from './dto/create-direct-ad.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

interface AuthenticatedRequest {
  user: {
    userId: string;
  };
}

@Controller('ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  @Post('impressions')
  logImpression(@Body() dto: CreateAdImpressionDto) {
    return this.adsService.logImpression(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('campaigns')
  createDirectCampaign(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createDirectAdSchema)) dto: CreateDirectAdDto
  ) {
    return this.adsService.createDirectCampaign(req.user.userId, dto);
  }
}
