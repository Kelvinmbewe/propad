import { Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { RewardsService } from './rewards.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@propad/config';

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

  @Post('distribute')
  @Roles(Role.ADMIN)
  async distributeRewards() {
    return this.rewardsService.distributeRewards();
  }
}
