import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { MetricsCacheService } from './metrics-cache.service';
import { MetricsGateway } from './metrics.gateway';
import { MetricsWatcherService } from './metrics-watcher.service';
import { CacheModule } from '../cache/cache.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [CacheModule, AuthModule],
  controllers: [MetricsController],
  providers: [MetricsService, MetricsCacheService, MetricsGateway, MetricsWatcherService],
  exports: [MetricsService]
})
export class MetricsModule {}
