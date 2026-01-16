import { EventEmitter } from "node:events";
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { env } from "@propad/config";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  AppConfig,
  appConfigSchema,
  defaultAppConfig,
} from "./app-config.schema";

type ConfigListener = (config: AppConfig) => void;

const GLOBAL_CONFIG_KEY = "global";

const cloneConfig = <T>(input: T): T => {
  return typeof structuredClone === "function"
    ? structuredClone(input)
    : (JSON.parse(JSON.stringify(input)) as T);
};

@Injectable()
export class AppConfigService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AppConfigService.name);
  private readonly emitter = new EventEmitter();
  private cache: AppConfig = cloneConfig(defaultAppConfig);
  private hotReloadTimer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.reloadFromStore();
    if (env.CONFIG_HOT_RELOAD) {
      this.startHotReload();
    }
  }

  onModuleDestroy(): void {
    if (this.hotReloadTimer) {
      clearInterval(this.hotReloadTimer);
    }
  }

  getConfig(): AppConfig {
    return cloneConfig(this.cache);
  }

  subscribe(listener: ConfigListener): () => void {
    this.emitter.on("updated", listener);
    return () => this.emitter.off("updated", listener);
  }

  async updateConfig(input: unknown, actorId: string): Promise<AppConfig> {
    const parsed = this.normalizeConfig(input);

    await this.prisma.$transaction([
      this.prisma.appConfig.upsert({
        where: { key: GLOBAL_CONFIG_KEY },
        create: {
          key: GLOBAL_CONFIG_KEY,
          jsonValue: parsed as unknown as Prisma.JsonObject,
        },
        update: { jsonValue: parsed as unknown as Prisma.JsonObject },
      }),
      this.audit.logAction({
        action: "config.updated",
        actorId,
        targetType: "app_config",
        targetId: GLOBAL_CONFIG_KEY,
        metadata: parsed as Record<string, unknown>,
      }),
    ]);

    this.setCache(parsed);
    return this.getConfig();
  }

  private async reloadFromStore(): Promise<void> {
    const record = await this.prisma.appConfig.findUnique({
      where: { key: GLOBAL_CONFIG_KEY },
    });
    if (!record) {
      this.logger.log("Initializing app config with defaults");
      await this.prisma.appConfig.create({
        data: {
          key: GLOBAL_CONFIG_KEY,
          jsonValue: defaultAppConfig as unknown as Prisma.JsonObject,
        },
      });
      this.setCache(defaultAppConfig);
      return;
    }

    const parsed = this.normalizeConfig(record.jsonValue);
    this.setCache(parsed);
  }

  private setCache(next: AppConfig): void {
    this.cache = cloneConfig(next);
    this.emitter.emit("updated", this.getConfig());
  }

  private normalizeConfig(input: unknown): AppConfig {
    const base = this.cache ?? defaultAppConfig;
    const candidate = {
      ...base,
      ...(input as Partial<AppConfig>),
      billing: {
        ...base.billing,
        ...(input as Partial<AppConfig>)?.billing,
        labels: {
          ...base.billing.labels,
          ...(input as Partial<AppConfig>)?.billing?.labels,
        },
        currency: {
          ...base.billing.currency,
          ...(input as Partial<AppConfig>)?.billing?.currency,
        },
      },
    };
    const parsed = appConfigSchema.parse(candidate);
    return {
      ...parsed,
      billing: {
        ...parsed.billing,
        currency: {
          ...parsed.billing.currency,
          supportedCurrencies: Array.from(
            new Set(parsed.billing.currency.supportedCurrencies),
          ),
        },
      },
    };
  }

  private startHotReload(): void {
    const intervalMs = 10_000;
    this.hotReloadTimer = setInterval(async () => {
      try {
        await this.reloadFromStore();
      } catch (error) {
        this.logger.error(
          "Failed to hot reload app config",
          error instanceof Error ? error.stack : String(error),
        );
      }
    }, intervalMs);
    if (this.hotReloadTimer.unref) {
      this.hotReloadTimer.unref();
    }
    this.logger.log(`App config hot-reload enabled (interval=${intervalMs}ms)`);
  }
}
