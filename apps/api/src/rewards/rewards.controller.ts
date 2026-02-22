import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { RewardsService } from './rewards.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('rewards')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) { }

  @Get('my')
  async getMyRewards(@Request() req: any) {
    return this.rewardsService.getUserRewards(req.user.id);
  }

  @Get('pools')
  async getPools() {
    return this.rewardsService.getRewardPools();
  }
}
