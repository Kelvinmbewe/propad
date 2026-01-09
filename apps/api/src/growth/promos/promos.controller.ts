import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { PromosService } from './promos.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('growth/promos')
@UseGuards(JwtAuthGuard)
export class PromosController {
    constructor(private promosService: PromosService) { }

    @Post('redeem')
    async redeem(@Request() req: any, @Body() body: { code: string }) {
        return this.promosService.redeemCode(req.user.id, body.code);
    }
}
