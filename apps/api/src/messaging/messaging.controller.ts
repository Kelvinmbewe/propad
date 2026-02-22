import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
} from "@nestjs/common";
import { ConversationsService } from "./conversations.service";
import { MessagesService } from "./messages.service";
import { CreateConversationDto } from "./dto/create-conversation.dto";
import { CreateMessageDto } from "./dto/create-message.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { User } from "../users/user.decorator";

@Controller("messaging")
@UseGuards(JwtAuthGuard)
export class MessagingController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly messagesService: MessagesService,
  ) {}

  @Post("conversations")
  createConversation(
    @User("id") userId: string,
    @Body() dto: CreateConversationDto,
  ) {
    return this.conversationsService.create(userId, dto);
  }

  @Get("conversations")
  getMyConversations(
    @User("id") userId: string,
    @Query("type") type?: string,
    @Query("status") status?: string,
    @Query("q") q?: string,
  ) {
    return this.conversationsService.findAll(userId, { type, status, q });
  }

  @Get("conversations/:id")
  getConversation(@User("id") userId: string, @Param("id") id: string) {
    return this.conversationsService.findOne(id, userId);
  }

  @Post("messages")
  sendMessage(@User("id") userId: string, @Body() dto: CreateMessageDto) {
    return this.messagesService.sendMessage(userId, dto);
  }

  @Get("conversations/:id/messages")
  getMessages(
    @User("id") userId: string,
    @Param("id") id: string,
    @Query("limit") limit?: string,
    @Query("cursor") cursor?: string,
  ) {
    return this.messagesService.getMessages(
      id,
      userId,
      Number(limit || 50),
      cursor,
    );
  }

  @Post("conversations/:id/read")
  markConversationRead(@User("id") userId: string, @Param("id") id: string) {
    return this.conversationsService.markRead(id, userId);
  }

  @Post("requests/:id/accept")
  acceptRequest(@User("id") userId: string, @Param("id") id: string) {
    return this.conversationsService.acceptRequest(id, userId);
  }

  @Post("requests/:id/decline")
  declineRequest(@User("id") userId: string, @Param("id") id: string) {
    return this.conversationsService.declineRequest(id, userId);
  }
}
