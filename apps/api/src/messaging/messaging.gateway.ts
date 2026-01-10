
import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnModuleInit } from '@nestjs/common';
import { Message } from '@prisma/client';

@WebSocketGateway({
    cors: {
        origin: '*', // Adjust for production
    },
    namespace: 'messaging'
})
export class MessagingGateway implements OnModuleInit {
    @WebSocketServer()
    server!: Server;

    onModuleInit() {
        // console.log('MessagingGateway initialized');
    }

    handleConnection(client: Socket) {
        // TODO: Authenticate socket
        // const token = client.handshake.auth.token;
        // Verify token...
        // client.join(userId);
    }

    @SubscribeMessage('joinRoom')
    handleJoinRoom(@MessageBody() data: { conversationId: string }, @ConnectedSocket() client: Socket) {
        client.join(data.conversationId);
        // console.log(`Client joined room: ${data.conversationId}`);
    }

    @SubscribeMessage('leaveRoom')
    handleLeaveRoom(@MessageBody() data: { conversationId: string }, @ConnectedSocket() client: Socket) {
        client.leave(data.conversationId);
    }

    emitMessage(conversationId: string, message: Message) {
        this.server.to(conversationId).emit('message.new', message);
    }
}
