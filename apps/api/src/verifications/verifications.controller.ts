
import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { VerificationsService } from './verifications.service';
import { VerificationType, VerificationItemStatus } from '@prisma/client';
import { ReviewVerificationItemDto } from '../properties/dto/review-verification-item.dto';

@Controller('verifications')
export class VerificationsController {
  constructor(private readonly verificationsService: VerificationsService) { }

  @Get()
  async listRequests(
    @Query('targetType') targetType?: VerificationType,
    @Query('status') status?: string
  ) {
    // Basic filter implementation request
    // In real app, would use comprehensive filter DTO
    return this.verificationsService.findAllRequests({ targetType, status });
  }

  @Patch('requests/:requestId/items/:itemId')
  async reviewItem(
    @Param('requestId') requestId: string,
    @Param('itemId') itemId: string,
    @Body() body: ReviewVerificationItemDto
  ) {
    // Mock actor for now
    const actor = { userId: 'admin-id' };
    return this.verificationsService.reviewItem(requestId, itemId, body, actor);
  }
}
