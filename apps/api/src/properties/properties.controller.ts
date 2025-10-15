import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards
} from '@nestjs/common';
import { Role } from '@prisma/client';
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

interface AuthenticatedRequest {
  user: {
    userId: string;
    role: Role;
  };
}

@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT, Role.LANDLORD, Role.ADMIN)
  listOwned(@Req() req: AuthenticatedRequest) {
    return this.propertiesService.listOwned(req.user);
  }

  @Get('agents/verified')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LANDLORD, Role.ADMIN)
  listVerifiedAgents() {
    return this.propertiesService.listVerifiedAgents();
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
  findOne(@Param('id') id: string) {
    return this.propertiesService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT, Role.LANDLORD, Role.ADMIN)
  create(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createPropertySchema)) dto: CreatePropertyDto
  ) {
    return this.propertiesService.create(dto, req.user);
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LANDLORD, Role.ADMIN)
  assignVerifiedAgent(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(assignAgentSchema)) dto: AssignAgentDto
  ) {
    return this.propertiesService.assignVerifiedAgent(id, dto, req.user);
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LANDLORD, Role.AGENT, Role.ADMIN)
  listMessages(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.propertiesService.listMessages(id, req.user);
  }

  @Post(':id/messages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LANDLORD, Role.AGENT)
  sendMessage(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createMessageSchema)) dto: CreateMessageDto
  ) {
    return this.propertiesService.sendMessage(id, dto, req.user);
  }

  @Post(':id/submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT, Role.LANDLORD, Role.ADMIN)
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
}
