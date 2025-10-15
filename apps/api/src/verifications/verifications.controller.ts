import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { VerificationsService } from './verifications.service';
import { ReviewVerificationDto, reviewVerificationSchema } from './dto/review-verification.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
  };
}

@Controller('verifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.VERIFIER, Role.ADMIN)
export class VerificationsController {
  constructor(private readonly verificationsService: VerificationsService) {}

  @Get('queue')
  listQueue() {
    return this.verificationsService.listQueue();
  }

  @Post(':id/approve')
  approve(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(reviewVerificationSchema)) dto: ReviewVerificationDto
  ) {
    return this.verificationsService.approve(id, dto, req.user);
  }

  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(reviewVerificationSchema)) dto: ReviewVerificationDto
  ) {
    return this.verificationsService.reject(id, dto, req.user);
  }
}
