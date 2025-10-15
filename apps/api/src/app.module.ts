import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { AdsModule } from './ads/ads.module';
import { PropertiesModule } from './properties/properties.module';
import { ShortLinksModule } from './shortlinks/shortlinks.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { FacebookModule } from './facebook/facebook.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    QueueModule,
    AdsModule,
    PropertiesModule,
    ShortLinksModule,
    WhatsAppModule,
    FacebookModule,
    AuthModule,
    HealthModule,
    MetricsModule
  ]
})
export class AppModule {}
