import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) { }

  @Get()
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ready',
        services: {
          database: 'up'
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new ServiceUnavailableException({
        status: 'not ready',
        services: {
          database: 'down'
        },
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
