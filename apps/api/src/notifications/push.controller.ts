import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { PushService } from './push.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('push')
@UseGuards(JwtAuthGuard)
export class PushController {
    constructor(private pushService: PushService) { }

    @Post('register')
    async register(@Request() req: any, @Body() body: { deviceId: string; platform: string; token: string }) {
        return this.pushService.registerToken(req.user.id, body.deviceId, body.platform, body.token);
    }

    @Post('unregister')
    async unregister(@Body() body: { deviceId: string }) {
        return this.pushService.unregisterToken(body.deviceId);
    }
}
