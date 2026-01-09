import { Controller, Get, Post, Param, UseGuards, Request } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Get()
    async getMyNotifications(@Request() req: any) {
        return this.notificationsService.getUserNotifications(req.user.id);
    }

    @Post(':id/read')
    async markAsRead(@Request() req: any, @Param('id') id: string) {
        return this.notificationsService.markAsRead(id, req.user.id);
    }

    @Post('read-all')
    async markAllRead(@Request() req: any) {
        return this.notificationsService.markAllAsRead(req.user.id);
    }
}
