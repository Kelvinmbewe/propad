import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PaymentMethodsService } from './payment-methods.service';
import { createPaymentMethodSchema, CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import {
  UpdatePaymentMethodStatusDto,
  updatePaymentMethodStatusSchema
} from './dto/update-payment-method-status.dto';
import {
  UpdatePaymentMethodConsentDto,
  updatePaymentMethodConsentSchema
} from './dto/update-payment-method-consent.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    role: Role;
  };
}

@Controller('payments/methods')
@UseGuards(JwtAuthGuard)
export class PaymentMethodsController {
  constructor(private readonly service: PaymentMethodsService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.service.listMethods(req.user);
  }

  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createPaymentMethodSchema)) dto: CreatePaymentMethodDto
  ) {
    return this.service.createMethod(dto, req.user);
  }

  @Post(':id/default')
  setDefault(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.setDefault(id, req.user);
  }

  @Post(':id/consent')
  updateConsent(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePaymentMethodConsentSchema)) dto: UpdatePaymentMethodConsentDto
  ) {
    return this.service.updateRecurringConsent(id, dto.consent, req.user);
  }

  @Post(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  updateStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePaymentMethodStatusSchema)) dto: UpdatePaymentMethodStatusDto
  ) {
    return this.service.updateStatus(id, dto, req.user);
  }
}
