import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { attachPrisma } from '@propad/sdk/server';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    attachPrisma(this);
    await this.$connect();

    // Safety Middleware
    this.$use(async (params, next) => {
      // 1. Soft Delete Guard for Property
      if (params.model === 'Property') {
        if (params.action === 'delete') {
          // Convert to soft delete (ARCHIVED)
          params.action = 'update';
          params.args['data'] = { status: 'ARCHIVED' };
        }
        if (params.action === 'deleteMany') {
          // Convert to soft delete (ARCHIVED)
          params.action = 'updateMany';
          if (params.args.data !== undefined) {
            params.args.data['status'] = 'ARCHIVED';
          } else {
            params.args['data'] = { status: 'ARCHIVED' };
          }
        }
      }

      // 2. Production Hard Delete Guard
      if (process.env.NODE_ENV === 'production') {
        const protectedModels = ['User', 'AdCampaign', 'Ledger', 'Wallet'];
        if (protectedModels.includes(params.model || '') && (params.action === 'delete' || params.action === 'deleteMany')) {
          throw new Error(`Hard delete of ${params.model} is FORBIDDEN in Production. Use status update.`);
        }
      }

      return next(params);
    });

    this.$on('query', (event) => {
      if (event.duration > 200) {
        this.logger.warn(`Slow query (${event.duration} ms): ${event.query} -- params: ${event.params}`);
      }
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
