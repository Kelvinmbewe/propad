import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
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
import { InterestsModule } from './interests/interests.module';
import { LeadsModule } from './leads/leads.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RewardsModule } from './rewards/rewards.module';
import { WalletsModule } from './wallets/wallets.module';
import { PromosModule } from './promos/promos.module';
import { AdminModule } from './admin/admin.module';
import { RateLimitGuard } from './security/rate-limit.guard';
import { GeoModule } from './geo/geo.module';
import { PaymentsModule } from './payments/payments.module';
import { MailModule } from './mail/mail.module';
import { AppConfigModule } from './app-config/app-config.module';
import { RolesModule } from './roles/roles.module';
import { AgenciesModule } from './agencies/agencies.module';
import { ProfilesModule } from './profiles/profiles.module';
import { TrustModule } from './trust/trust.module';
import { RankingModule } from './ranking/ranking.module';
import { SiteVisitsModule } from './site-visits/site-visits.module';
import { MonetizationModule } from './monetization/monetization.module';
import { AdvertisersModule } from './advertisers/advertisers.module';
import { WalletModule } from './wallet/wallet.module';
import { PayoutsModule } from './payouts/payouts.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AuditModule } from './audit/audit.module';
import { ReconciliationModule } from './reconciliation/reconciliation.module';
import { OpsModule } from './ops/ops.module';
import { PricingModule } from './pricing/pricing.module';
import { SecurityModule } from './security/security.module';
import { GrowthModule } from './growth/growth.module';
import { DealsModule } from './deals/deals.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.register({ isGlobal: true, ttl: 300, max: 100 }),
    ThrottlerModule.forRoot([{ ttl: 60, limit: 120 }]),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100, // Global limit 100 req/min
    }]),
    PrismaModule,
    QueueModule,
    AdsModule,
    PropertiesModule,
    SiteVisitsModule,
    ShortLinksModule,
    WhatsAppModule,
    FacebookModule,
    VerificationsModule,
    LeadsModule,
    NotificationsModule,
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
    AppConfigModule,
    RolesModule,
    AgenciesModule,
    ProfilesModule,
    TrustModule,
    RankingModule,
    MonetizationModule,
    AdvertisersModule,
    WalletModule,
    MessagingModule,
    PayoutsModule,
    DashboardModule,
    AuthenticationModule, // Alias if needed, assuming AuthModule is correct
    AuthenticationModule, // Alias if needed, assuming AuthModule is correct
    AuditModule,
    ReconciliationModule,
    OpsModule,
    PricingModule,
    SecurityModule,
    GrowthModule,
    MessagingModule,
    InterestsModule,
    ApplicationsModule,
    DealsModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard
    }
  ]
})
export class AppModule { }
