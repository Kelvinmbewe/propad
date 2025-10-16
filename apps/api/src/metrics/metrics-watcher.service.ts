import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { startOfDay } from 'date-fns';
import { MetricsCacheService } from './metrics-cache.service';
import { MetricsService } from './metrics.service';
import { MetricsGateway } from './metrics.gateway';
import { PrismaService } from '../prisma/prisma.service';

const MUTATING_ACTIONS = new Set<Prisma.PrismaAction>([
  'create',
  'update',
  'upsert',
  'delete',
  'deleteMany',
  'updateMany'
]);

@Injectable()
export class MetricsWatcherService implements OnModuleInit {
  private readonly logger = new Logger(MetricsWatcherService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: MetricsCacheService,
    private readonly metrics: MetricsService,
    private readonly gateway: MetricsGateway
  ) {}

  onModuleInit() {
    this.prisma.$use(async (params, next) => {
      const result = await next(params);
      await this.handleMutation(params, result);
      return result;
    });
  }

  private async handleMutation(params: Prisma.MiddlewareParams, result: any) {
    const model = params.model;
    const action = params.action;
    if (!model) {
      return;
    }

    if (model === 'Property' && MUTATING_ACTIONS.has(action)) {
      await this.cache.invalidateOverview();
      await this.cache.invalidateTopAgents();
      const overview = await this.metrics.getOverview({ refresh: true });
      await this.gateway.emitOverviewUpdate(overview);
      return;
    }

    if (model === 'AdCampaign' && MUTATING_ACTIONS.has(action)) {
      await this.cache.invalidateOverview();
      await this.cache.invalidateAllDailyAds();
      const overview = await this.metrics.getOverview({ refresh: true });
      await this.gateway.emitOverviewUpdate(overview);
      return;
    }

    if (model === 'PayoutRequest' && MUTATING_ACTIONS.has(action)) {
      await this.cache.invalidateOverview();
      const overview = await this.metrics.getOverview({ refresh: true });
      await this.gateway.emitOverviewUpdate(overview);
      return;
    }

    if (model === 'Lead') {
      if (action === 'create' && result) {
        await this.cache.invalidateOverview();
        await this.cache.invalidateTopAgents();
        await this.gateway.emitLeadCreated({
          leadId: result.id,
          propertyId: result.propertyId,
          status: result.status,
          createdAt: result.createdAt?.toISOString?.() ?? new Date().toISOString()
        });
        const overview = await this.metrics.getOverview({ refresh: true });
        await this.gateway.emitOverviewUpdate(overview);
      } else if (MUTATING_ACTIONS.has(action)) {
        await this.cache.invalidateOverview();
        await this.cache.invalidateTopAgents();
      }
      return;
    }

    if (model === 'AdImpression' && action === 'create' && result) {
      const createdAt = result.createdAt ? new Date(result.createdAt) : new Date();
      const day = startOfDay(createdAt);
      await this.cache.invalidateDailyAdsForDate(day);
      const [point] = await this.metrics.computeDailyAdsForDates([day]);
      await this.gateway.emitAdsTick(point);
      await this.cache.invalidateOverview();
      const overview = await this.metrics.getOverview({ refresh: true });
      await this.gateway.emitOverviewUpdate(overview);
      return;
    }
  }
}
