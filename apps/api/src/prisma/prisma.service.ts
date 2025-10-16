import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
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
