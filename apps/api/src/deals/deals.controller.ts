import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { DealsService } from './deals.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthContext } from '../auth/interfaces/auth-context.interface';

interface AuthenticatedRequest {
    user: AuthContext;
}

@Controller('deals')
@UseGuards(JwtAuthGuard)
export class DealsController {
    constructor(private readonly service: DealsService) { }

    @Get('my')
    getMyDeals(@Req() req: AuthenticatedRequest) {
        return this.service.findMyDeals(req.user.userId);
    }

    @Get(':id')
    getDeal(
        @Param('id') id: string,
        @Req() req: AuthenticatedRequest
    ) {
        return this.service.findOne(id, req.user.userId);
    }
}
