import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PaymentProvider } from "@propad/config";
import { Prisma } from "@prisma/client";
// import { PaymentProvider, Prisma } from '@prisma/client';
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class PaymentProviderSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll() {
    return this.prisma.paymentProviderSettings.findMany({
      orderBy: { provider: "asc" },
    });
  }

  async findOne(provider: PaymentProvider) {
    const settings = await this.prisma.paymentProviderSettings.findUnique({
      where: { provider },
    });
    if (!settings) {
      throw new NotFoundException(
        `Payment provider settings not found for ${provider}`,
      );
    }
    return settings;
  }

  async getEnabledProviders() {
    return this.prisma.paymentProviderSettings.findMany({
      where: { enabled: true },
      orderBy: { provider: "asc" },
    });
  }

  async getEnabledGateways() {
    const settings = await this.getEnabledProviders();
    const gateways: string[] = [];

    for (const provider of settings) {
      if (provider.provider === PaymentProvider.PAYNOW) {
        gateways.push("PAYNOW");
      }
      if (provider.provider === PaymentProvider.STRIPE) {
        gateways.push("STRIPE");
      }
      if (provider.provider === PaymentProvider.PAYPAL) {
        gateways.push("PAYPAL");
      }
    }

    if (gateways.length === 0) {
      return ["OFFLINE"];
    }

    return gateways;
  }

  async getDefaultProvider() {
    return this.prisma.paymentProviderSettings.findFirst({
      where: { enabled: true, isDefault: true },
    });
  }

  async createOrUpdate(
    provider: PaymentProvider,
    data: {
      enabled?: boolean;
      isDefault?: boolean;
      isTestMode?: boolean;
      apiKey?: string;
      apiSecret?: string;
      returnUrl?: string;
      webhookUrl?: string;
      webhookSecret?: string;
      configJson?: Prisma.InputJsonValue;
    },
    actorId: string,
  ) {
    // If setting as default, unset other defaults
    if (data.isDefault === true) {
      await this.prisma.paymentProviderSettings.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    // Validate credentials if enabling
    if (data.enabled === true) {
      await this.validateProvider(provider, data);
    }

    const settings = await this.prisma.paymentProviderSettings.upsert({
      where: { provider },
      create: {
        provider,
        enabled: data.enabled ?? false,
        isDefault: data.isDefault ?? false,
        isTestMode: data.isTestMode ?? true,
        apiKey: data.apiKey,
        apiSecret: data.apiSecret,
        returnUrl: data.returnUrl,
        webhookUrl: data.webhookUrl,
        webhookSecret: data.webhookSecret,
        configJson: data.configJson,
        validatedAt: data.enabled ? new Date() : null,
        validatedBy: data.enabled ? actorId : null,
      },
      update: {
        enabled: data.enabled,
        isDefault: data.isDefault,
        isTestMode: data.isTestMode,
        apiKey: data.apiKey,
        apiSecret: data.apiSecret,
        returnUrl: data.returnUrl,
        webhookUrl: data.webhookUrl,
        webhookSecret: data.webhookSecret,
        configJson: data.configJson,
        validatedAt: data.enabled ? new Date() : null,
        validatedBy: data.enabled ? actorId : null,
      },
    });

    await this.audit.logAction({
      action: "paymentProvider.updated",
      actorId,
      targetType: "paymentProvider",
      targetId: provider,
      metadata: { enabled: settings.enabled, isDefault: settings.isDefault },
    });

    return settings;
  }

  async toggleEnabled(
    provider: PaymentProvider,
    enabled: boolean,
    actorId: string,
  ) {
    const settings = await this.findOne(provider);

    if (enabled && !settings.apiKey) {
      throw new BadRequestException(
        "Cannot enable provider without API credentials",
      );
    }

    const updated = await this.prisma.paymentProviderSettings.update({
      where: { provider },
      data: { enabled },
    });

    await this.audit.logAction({
      action: enabled ? "paymentProvider.enabled" : "paymentProvider.disabled",
      actorId,
      targetType: "paymentProvider",
      targetId: provider,
    });

    return updated;
  }

  async setDefault(provider: PaymentProvider, actorId: string) {
    const settings = await this.findOne(provider);
    if (!settings.enabled) {
      throw new BadRequestException("Cannot set disabled provider as default");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.paymentProviderSettings.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
      await tx.paymentProviderSettings.update({
        where: { provider },
        data: { isDefault: true },
      });
    });

    await this.audit.logAction({
      action: "paymentProvider.setDefault",
      actorId,
      targetType: "paymentProvider",
      targetId: provider,
    });

    return this.findOne(provider);
  }

  private async validateProvider(
    provider: PaymentProvider,
    data: any,
  ): Promise<void> {
    // Basic validation - in production, you'd test API connectivity
    if (provider === PaymentProvider.PAYNOW) {
      if (!data.apiKey || !data.apiSecret) {
        throw new BadRequestException("Paynow requires API key and secret");
      }
    } else if (provider === PaymentProvider.STRIPE) {
      if (!data.apiKey || !data.apiSecret) {
        throw new BadRequestException("Stripe requires API key and secret");
      }
    } else if (provider === PaymentProvider.PAYPAL) {
      if (!data.apiKey || !data.apiSecret) {
        throw new BadRequestException("PayPal requires client ID and secret");
      }
    }
  }
}
