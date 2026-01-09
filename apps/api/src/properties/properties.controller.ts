import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@propad/config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PropertiesService } from './properties.service';
import { SearchPropertiesDto } from './dto/search-properties.dto';
import { CreatePropertyDto, createPropertySchema } from './dto/create-property.dto';
import { UpdatePropertyDto, updatePropertySchema } from './dto/update-property.dto';
import {
  SubmitForVerificationDto,
  submitForVerificationSchema
} from './dto/submit-verification.dto';
import { MapBoundsDto, mapBoundsSchema } from './dto/map-bounds.dto';
import { CreateSignedUploadDto, createSignedUploadSchema } from './dto/signed-upload.dto';
import { AssignAgentDto, assignAgentSchema } from './dto/assign-agent.dto';
import {
  UpdateDealConfirmationDto,
  updateDealConfirmationSchema
} from './dto/update-deal-confirmation.dto';
import { CreateMessageDto, createMessageSchema } from './dto/create-message.dto';
import { UpdateServiceFeeDto, updateServiceFeeSchema } from './dto/update-service-fee.dto';
import { ScheduleViewingDto, scheduleViewingSchema } from './dto/schedule-viewing.dto';
import { RespondViewingDto, respondViewingSchema } from './dto/respond-viewing.dto';
import { UpdateVerificationItemDto, updateVerificationItemSchema } from './dto/update-verification-item.dto';
import { ReviewVerificationItemDto, reviewVerificationItemSchema } from './dto/review-verification-item.dto';
import { SubmitPropertyRatingDto, submitPropertyRatingSchema } from './dto/submit-property-rating.dto';
import { PaymentRequired } from '../payments/decorators/payment-required.decorator';
import { PaymentRequiredGuard } from '../payments/guards/payment-required.guard';

interface AuthenticatedRequest {
  user: {
    userId: string;
    role: Role;
  };
}

@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) { }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT, Role.LANDLORD, Role.ADMIN)
  async listOwned(@Req() req: AuthenticatedRequest) {
    try {
      const result = await this.propertiesService.listOwned(req.user);
      // Test serialization
      try {
        JSON.stringify(result);
      } catch (serialError) {
        const serialErrorMessage = serialError instanceof Error ? serialError.message : String(serialError);
        console.error('[PropertiesController] listOwned serialization error:', serialErrorMessage);
        // Return empty array instead of throwing to prevent 500
        return [];
      }
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[PropertiesController] listOwned error:', errorMessage, error instanceof Error ? error.stack : '');
      // Return empty array instead of throwing to prevent 500
      return [];
    }
  }

  @Get('agents/verified')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LANDLORD, Role.ADMIN)
  listVerifiedAgents() {
    return this.propertiesService.listVerifiedAgents();
  }

  @Get('agents/search')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LANDLORD, Role.ADMIN)
  searchAgents(@Query('q') query: string) {
    return this.propertiesService.searchAgents(query || '');
  }

  @Get('search')
  search(@Query() dto: SearchPropertiesDto) {
    return this.propertiesService.search(dto);
  }

  @Get('map/bounds')
  mapBounds(@Query(new ZodValidationPipe(mapBoundsSchema)) dto: MapBoundsDto) {
    return this.propertiesService.mapBounds(dto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const result = await this.propertiesService.findById(id);
      // Test serialization
      JSON.stringify(result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[PropertiesController] findOne error:', errorMessage, error instanceof Error ? error.stack : '');
      throw error;
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT, Role.LANDLORD, Role.ADMIN)
  async create(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createPropertySchema)) dto: CreatePropertyDto
  ) {
    try {
      console.log('[PropertiesController] Creating property with DTO:', JSON.stringify(dto, null, 2));
      const result = await this.propertiesService.create(dto, req.user);
      // Test serialization
      try {
        JSON.stringify(result);
      } catch (serialError) {
        const serialErrorMessage = serialError instanceof Error ? serialError.message : String(serialError);
        console.error('[PropertiesController] create serialization error:', serialErrorMessage);
        // Return the result anyway - serialization test is just for debugging
      }
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      console.error('[PropertiesController] create error:', errorMessage);
      console.error('[PropertiesController] create error stack:', errorStack);

      // DIAGNOSTIC: Re-throw BadRequestException with full details
      // This preserves validation error details from ZodValidationPipe
      if (error instanceof BadRequestException) {
        // Log the full error response for debugging
        const errorResponse = error.getResponse();
        console.error('[PropertiesController] Full validation error response:', JSON.stringify(errorResponse, null, 2));
        // Ensure the error response is returned as-is with all diagnostic details
        throw error;
      }
      // For other errors, wrap in BadRequestException with diagnostic details
      const diagnosticError = {
        message: 'Failed to create property',
        error: errorMessage,
        stack: errorStack,
        type: error?.constructor?.name || 'UnknownError'
      };
      throw new BadRequestException(diagnosticError);
    }
  }

  @Patch(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT, Role.LANDLORD, Role.ADMIN)
  publish(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest
  ) {
    return this.propertiesService.publish(id, req.user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT, Role.LANDLORD, Role.ADMIN)
  update(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(updatePropertySchema)) dto: UpdatePropertyDto
  ) {
    return this.propertiesService.update(id, dto, req.user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT, Role.LANDLORD, Role.ADMIN)
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.propertiesService.remove(id, req.user);
  }

  @Post(':id/assign-agent')
  @UseGuards(JwtAuthGuard, RolesGuard, PaymentRequiredGuard)
  @Roles(Role.LANDLORD, Role.ADMIN)
  @PaymentRequired('AGENT_ASSIGNMENT', 'id')
  assignVerifiedAgent(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(assignAgentSchema)) dto: AssignAgentDto
  ) {
    return this.propertiesService.assignVerifiedAgent(id, dto, req.user);
  }

  @Patch(':id/service-fee')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LANDLORD, Role.ADMIN)
  updateServiceFee(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(updateServiceFeeSchema)) dto: UpdateServiceFeeDto
  ) {
    return this.propertiesService.updateServiceFee(id, dto, req.user);
  }

  @Patch(':id/deal-confirmation')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LANDLORD, Role.ADMIN)
  updateDealConfirmation(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(updateDealConfirmationSchema)) dto: UpdateDealConfirmationDto
  ) {
    return this.propertiesService.updateDealConfirmation(id, dto, req.user);
  }

  @Get(':id/messages')
  @UseGuards(JwtAuthGuard)
  listMessages(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.propertiesService.listMessages(id, req.user);
  }

  @Post(':id/messages')
  @UseGuards(JwtAuthGuard)
  sendMessage(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createMessageSchema)) dto: CreateMessageDto
  ) {
    return this.propertiesService.sendMessage(id, dto, req.user);
  }

  @Post(':id/submit')
  @UseGuards(JwtAuthGuard, RolesGuard, PaymentRequiredGuard)
  @Roles(Role.AGENT, Role.LANDLORD, Role.ADMIN)
  @PaymentRequired('PROPERTY_VERIFICATION', 'id')
  submitForVerification(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(submitForVerificationSchema)) dto: SubmitForVerificationDto
  ) {
    return this.propertiesService.submitForVerification(id, dto, req.user);
  }

  @Post('upload-url')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT, Role.LANDLORD, Role.ADMIN)
  createSignedUpload(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createSignedUploadSchema)) dto: CreateSignedUploadDto
  ) {
    return this.propertiesService.createSignedUpload(dto, req.user);
  }

  @Get(':id/media')
  listMedia(@Param('id') id: string) {
    return this.propertiesService.listMedia(id);
  }

  @Delete(':id/media/:mediaId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT, Role.LANDLORD, Role.ADMIN)
  deleteMedia(
    @Param('id') id: string,
    @Param('mediaId') mediaId: string,
    @Req() req: AuthenticatedRequest
  ) {
    return this.propertiesService.deleteMedia(id, mediaId, req.user);
  }

  @Post(':id/media/upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT, Role.LANDLORD, Role.ADMIN)
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      const allowedMimes = [
        'image/jpeg', 'image/png', 'image/webp', 'video/mp4',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only JPEG, PNG, WebP, MP4, PDF, and Word documents are allowed'), false);
      }
    }
  }))
  uploadMedia(
    @Param('id') id: string,
    @UploadedFile() file: { originalname: string; mimetype: string; buffer: Buffer },
    @Req() req: AuthenticatedRequest
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return this.propertiesService.uploadLocalMedia(id, {
      filename: file.originalname,
      mimetype: file.mimetype,
      buffer: file.buffer
    }, req.user);
  }

  @Post(':id/viewings/schedule')
  @UseGuards(JwtAuthGuard)
  scheduleViewing(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(scheduleViewingSchema)) dto: ScheduleViewingDto
  ) {
    return this.propertiesService.scheduleViewing(id, dto, req.user);
  }

  @Post('viewings/:viewingId/respond')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LANDLORD, Role.AGENT, Role.ADMIN)
  respondToViewing(
    @Param('viewingId') viewingId: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(respondViewingSchema)) dto: RespondViewingDto
  ) {
    return this.propertiesService.respondToViewing(viewingId, dto, req.user);
  }

  @Get(':id/viewings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LANDLORD, Role.AGENT, Role.ADMIN)
  listViewings(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest
  ) {
    return this.propertiesService.listViewings(id, req.user);
  }

  @Get(':id/payments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LANDLORD, Role.AGENT, Role.ADMIN)
  listPayments(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest
  ) {
    return this.propertiesService.listPayments(id, req.user);
  }

  @Get(':id/verification-request')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LANDLORD, Role.AGENT, Role.ADMIN)
  getVerificationRequest(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest
  ) {
    return this.propertiesService.getVerificationRequest(id, req.user);
  }

  @Patch(':propertyId/verification-items/:itemId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LANDLORD, Role.AGENT, Role.ADMIN)
  updateVerificationItem(
    @Param('propertyId') propertyId: string,
    @Param('itemId') itemId: string,
    @Body(new ZodValidationPipe(updateVerificationItemSchema)) dto: UpdateVerificationItemDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.propertiesService.updateVerificationItem(propertyId, itemId, dto, req.user);
  }




  @Post(':id/ratings')
  @UseGuards(JwtAuthGuard)
  submitPropertyRating(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(submitPropertyRatingSchema)) dto: SubmitPropertyRatingDto
  ) {
    return this.propertiesService.submitPropertyRating(id, dto, req.user);
  }

  @Get(':id/ratings')
  @UseGuards(JwtAuthGuard)
  getPropertyRatings(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest
  ) {
    return this.propertiesService.getPropertyRatings(id, req.user);
  }

  @Get(':id/activity-logs')
  @UseGuards(JwtAuthGuard)
  getActivityLogs(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest
  ) {
    return this.propertiesService.getActivityLogs(id, req.user);
  }
}
