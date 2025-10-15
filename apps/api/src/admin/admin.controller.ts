import { Body, Controller, Get, Header, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AdminService } from './admin.service';
import { CreateStrikeDto, createStrikeSchema } from './dto/create-strike.dto';
import { UpdateFeatureFlagDto, updateFeatureFlagSchema } from './dto/update-feature-flag.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
  };
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('strikes')
  createStrike(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createStrikeSchema)) dto: CreateStrikeDto
  ) {
    return this.adminService.createStrike(dto, req.user.userId);
  }

  @Get('strikes')
  listStrikes(@Query('agentId') agentId?: string) {
    return this.adminService.listStrikes(agentId);
  }

  @Post('feature-flags')
  updateFeatureFlag(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(updateFeatureFlagSchema)) dto: UpdateFeatureFlagDto
  ) {
    return this.adminService.updateFeatureFlag(dto, req.user.userId);
  }

  @Get('feature-flags')
  listFeatureFlags() {
    return this.adminService.listFeatureFlags();
  }

  @Get('exports/properties')
  @Header('Content-Type', 'text/csv')
  exportProperties() {
    return this.adminService.exportPropertiesCsv();
  }

  @Get('exports/leads')
  @Header('Content-Type', 'text/csv')
  exportLeads() {
    return this.adminService.exportLeadsCsv();
  }

  @Get('analytics/summary')
  analytics() {
    return this.adminService.analyticsSummary();
  }
}
