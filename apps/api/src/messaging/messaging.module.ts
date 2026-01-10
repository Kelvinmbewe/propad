
import { Module } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { MessagesService } from './messages.service';
import { MessagingController } from './messaging.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { MessagingGateway } from './messaging.gateway';

@Module({
    imports: [PrismaModule, AuthModule],
    controllers: [MessagingController],
    providers: [ConversationsService, MessagesService, MessagingGateway],
    exports: [ConversationsService, MessagesService]
})
export class MessagingModule { }
