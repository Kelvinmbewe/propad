import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PaymentProviderSettingsService } from './payment-provider-settings.service';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { z } from 'zod';

interface AuthenticatedRequest {
  user: {
    userId: string;
  };
}

const updateProviderSchema = z.object({
  enabled: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  isTestMode: z.boolean().optional(),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  returnUrl: z.string().url().optional(),
  webhookUrl: z.string().url().optional(),
  webhookSecret: z.string().optional(),
  configJson: z.record(z.unknown()).optional()
});

@Controller('payment-providers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentProviderSettingsController {
  constructor(private readonly service: PaymentProviderSettingsService) {}

  @Get()
  @Roles('ADMIN')
  findAll() {
    return this.service.findAll();
  }

  @Get('enabled')
  getEnabledProviders() {
    return this.service.getEnabledProviders();
  }

  @Get('default')
  getDefaultProvider() {
    return this.service.getDefaultProvider();
  }

  @Get(':provider')
  @Roles('ADMIN')
  findOne(@Param('provider') provider: PaymentProvider) {
    return this.service.findOne(provider);
  }

  @Post(':provider')
  @Roles('ADMIN')
  createOrUpdate(
    @Req() req: AuthenticatedRequest,
    @Param('provider') provider: PaymentProvider,
    @Body(new ZodValidationPipe(updateProviderSchema)) body: z.infer<typeof updateProviderSchema>
  ) {
    return this.service.createOrUpdate(provider, body, req.user.userId);
  }

  @Patch(':provider/toggle')
  @Roles('ADMIN')
  toggleEnabled(
    @Req() req: AuthenticatedRequest,
    @Param('provider') provider: PaymentProvider,
    @Body('enabled') enabled: boolean
  ) {
    return this.service.toggleEnabled(provider, enabled, req.user.userId);
  }

  @Patch(':provider/default')
  @Roles('ADMIN')
  setDefault(
    @Req() req: AuthenticatedRequest,
    @Param('provider') provider: PaymentProvider
  ) {
    return this.service.setDefault(provider, req.user.userId);
  }
}

