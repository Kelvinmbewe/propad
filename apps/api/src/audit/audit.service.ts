import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogInput {
  action: string;
  actorId?: string | null;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Best-effort audit logging. Failures here must never break the main request flow.
   */
  async log(entry: AuditLogInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: entry.action,
          actorId: entry.actorId ?? null,
          targetType: entry.targetType,
          targetId: entry.targetId ?? null,
          metadata: entry.metadata ?? undefined
        }
      });
    } catch {
      // Swallow audit errors (e.g. foreign key violations if actorId no longer exists)
      // to avoid turning non-critical logging failures into 500 responses.
    }
  }
}
