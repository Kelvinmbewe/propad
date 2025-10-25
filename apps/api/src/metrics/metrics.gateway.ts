import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { env } from '@propad/config';
import { LeadRealtimePayload, DailyAdsPoint, OverviewMetricsResponse } from './metrics.types';

interface AuthenticatedSocket extends Socket {
  data: {
    userId?: string;
    role?: string;
  };
}

@WebSocketGateway({
  namespace: 'admin.metrics',
  cors: {
    origin: env.WEB_ORIGIN?.split(',') ?? '*',
    credentials: true
  }
})
export class MetricsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(MetricsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  handleConnection(client: AuthenticatedSocket) {
    if (!env.WS_ENABLED) {
      client.disconnect(true);
      return;
    }
    try {
      const token = this.extractToken(client);
      if (!token) {
        throw new Error('Missing token');
      }
      const payload = this.jwtService.verify<{ sub: string; role: string }>(token, {
        secret: env.JWT_SECRET
      });
      if (!['ADMIN', 'VERIFIER'].includes(payload.role)) {
        throw new Error('Insufficient role');
      }
      client.data.userId = payload.sub;
      client.data.role = payload.role;
      this.logger.debug(`metrics socket connected: ${payload.sub}`);
    } catch (error) {
      this.logger.warn(`metrics socket rejected: ${error instanceof Error ? error.message : error}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.data.userId) {
      this.logger.debug(`metrics socket disconnected: ${client.data.userId}`);
    }
  }

  async emitOverviewUpdate(payload: OverviewMetricsResponse) {
    if (!env.WS_ENABLED) {
      return;
    }
    this.server.emit('metrics:overview:update', payload);
  }

  async emitAdsTick(payload: DailyAdsPoint) {
    if (!env.WS_ENABLED) {
      return;
    }
    this.server.emit('metrics:ads:tick', payload);
  }

  async emitLeadCreated(payload: LeadRealtimePayload) {
    if (!env.WS_ENABLED) {
      return;
    }
    this.server.emit('leads:new', payload);
  }

  private extractToken(client: Socket) {
    const authorizationHeader = client.handshake.headers.authorization;
    if (typeof authorizationHeader === 'string') {
      const parts = authorizationHeader.split(' ');
      if (parts[1]) {
        return parts[1];
      }
    } else if (Array.isArray(authorizationHeader)) {
      for (const value of authorizationHeader as string[]) {
        if (typeof value === 'string') {
          const parts = value.split(' ');
          if (parts[1]) {
            return parts[1];
          }
        }
      }
    }
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string') {
      return authToken;
    }
    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === 'string') {
      return queryToken;
    }
    return null;
  }
}
