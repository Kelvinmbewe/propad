
import { Body, Controller, Get, Logger, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { VerificationsService } from './verifications.service';
import { VerificationType } from '@prisma/client';
import { Role } from '@propad/config';
import { PaginationDto } from '../common/pagination.dto';

const VerificationItemStatus = {
  PENDING: 'PENDING',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;
import { ReviewVerificationItemDto } from '../properties/dto/review-verification-item.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface AuthenticatedRequest {
  user: {
    userId: string;
    role: Role;
  };
}

@Controller('verifications')
export class VerificationsController {
  private readonly logger = new Logger(VerificationsController.name);

  constructor(private readonly verificationsService: VerificationsService) { }

  @Get('queue')
  async getQueue() {
    try {
      return await this.verificationsService.getVerificationQueue();
    } catch (error) {
      this.logger.error('Failed to get verification queue', error);
      return [];
    }
  }

  @Get()
  async listRequests(
    @Query('targetType') targetType?: VerificationType,
    @Query('status') status?: string,
    @Query() pagination?: PaginationDto
  ) {
    // Basic filter implementation request
    // In real app, would use comprehensive filter DTO
    return this.verificationsService.findAllRequests({ targetType, status, ...pagination });
  }

  @Get('requests/:id')
  async getRequest(@Param('id') id: string) {
    return this.verificationsService.getRequest(id);
  }

  @Patch('requests/:requestId/items/:itemId')
  @UseGuards(JwtAuthGuard)
  async reviewItem(
    @Param('requestId') requestId: string,
    @Param('itemId') itemId: string,
    @Body() body: ReviewVerificationItemDto,
    @Req() req: AuthenticatedRequest
  ) {
    // Extract verifierId strictly from req.user.id (guaranteed to exist in database via JWT strategy auto-sync)
    const actor = { userId: req.user.userId };
    return this.verificationsService.reviewItem(requestId, itemId, body, actor);
  }
}
