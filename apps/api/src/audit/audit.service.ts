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

  log(entry: AuditLogInput) {
    return this.prisma.auditLog.create({
      data: {
        action: entry.action,
        actorId: entry.actorId ?? null,
        targetType: entry.targetType,
        targetId: entry.targetId ?? null,
        metadata: entry.metadata ?? undefined
      }
    });
  }
}
