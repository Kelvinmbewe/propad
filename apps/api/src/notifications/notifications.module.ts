import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PrismaModule } from '../prisma/prisma.module';

import { PushService } from './push.service';
import { PushController } from './push.controller';

@Module({
    imports: [PrismaModule],
    controllers: [NotificationsController, PushController],
    providers: [NotificationsService, PushService],
    exports: [NotificationsService, PushService]
})
export class NotificationsModule { }
