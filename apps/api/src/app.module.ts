import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
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
import { VerificationsModule } from './verifications/verifications.module';
import { LeadsModule } from './leads/leads.module';
import { RewardsModule } from './rewards/rewards.module';
import { WalletsModule } from './wallets/wallets.module';
import { PromosModule } from './promos/promos.module';
import { AdminModule } from './admin/admin.module';
import { RateLimitGuard } from './security/rate-limit.guard';
import { GeoModule } from './geo/geo.module';
import { PaymentsModule } from './payments/payments.module';
import { MailModule } from './mail/mail.module';
import { AppConfigModule } from './app-config/app-config.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60, limit: 120 }]),
    PrismaModule,
    QueueModule,
    AdsModule,
    PropertiesModule,
    ShortLinksModule,
    WhatsAppModule,
    FacebookModule,
    VerificationsModule,
    LeadsModule,
    RewardsModule,
    WalletsModule,
    PromosModule,
    AdminModule,
    AuthModule,
    HealthModule,
    MetricsModule,
    GeoModule,
    PaymentsModule,
    MailModule,
    AppConfigModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard
    }
  ]
})
export class AppModule {}
