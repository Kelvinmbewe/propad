import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Role } from '@propad/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { LeadsService } from './leads.service';
import { CreateLeadDto, createLeadSchema } from './dto/create-lead.dto';
import { UpdateLeadStatusDto, updateLeadStatusSchema } from './dto/update-lead-status.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
  };
}

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) { }

  @Post()
  create(@Body(new ZodValidationPipe(createLeadSchema)) dto: CreateLeadDto) {
    return this.leadsService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT, Role.ADMIN)
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(updateLeadStatusSchema)) dto: UpdateLeadStatusDto
  ) {
    return this.leadsService.updateStatus(id, dto, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT, Role.LANDLORD, Role.ADMIN) // Added LANDLORD
  @Get('analytics/summary')
  analytics(@Req() req: AuthenticatedRequest) {
    // Cast to include role since AuthenticatedRequest in this file might be minimal
    // But we should improve the interface definition ideally.
    return this.leadsService.analytics(req.user as any);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT, Role.LANDLORD, Role.ADMIN)
  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.leadsService.findAll(req.user as any);
  }
}
