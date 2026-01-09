import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) { }

  async logAction(params: {
    action: string;
    actorId?: string;
    targetType: string;
    targetId?: string;
    metadata?: Record<string, any>;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: params.action,
          actorId: params.actorId,
          targetType: params.targetType,
          targetId: params.targetId,
          metadata: params.metadata || {},
        },
      });
    } catch (error) {
      // Audit logging should not break the main flow, but we must log the failure
      this.logger.error('Failed to create audit log', error);
    }
  }
}
