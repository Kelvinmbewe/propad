import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
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
import { RewardsService } from './rewards.service';
import { CreateRewardEventDto, createRewardEventSchema } from './dto/create-reward-event.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    role: Role;
  };
}

@Controller('rewards')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.AGENT, Role.ADMIN)
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Roles(Role.ADMIN)
  @Post('events')
  createEvent(@Body(new ZodValidationPipe(createRewardEventSchema)) dto: CreateRewardEventDto) {
    return this.rewardsService.create(dto);
  }

  @Get('events')
  listEvents(@Req() req: AuthenticatedRequest, @Query('agentId') agentId?: string) {
    if (req.user.role === Role.AGENT && agentId && agentId !== req.user.userId) {
      throw new ForbiddenException('Cannot view other agents');
    }
    return this.rewardsService.list(agentId ?? (req.user.role === Role.AGENT ? req.user.userId : undefined));
  }

  @Roles(Role.ADMIN)
  @Get('pool/summary')
  poolSummary() {
    return this.rewardsService.poolSummary();
  }

  @Get('agents/:agentId/monthly-estimate')
  agentEstimate(@Param('agentId') agentId: string, @Req() req: AuthenticatedRequest) {
    if (req.user.role === Role.AGENT && req.user.userId !== agentId) {
      throw new ForbiddenException('Cannot view other agents');
    }
    return this.rewardsService.agentMonthlyEstimate(agentId);
  }
}
