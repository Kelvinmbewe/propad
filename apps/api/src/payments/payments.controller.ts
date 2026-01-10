import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Currency } from '@prisma/client';
import { ChargeableItemType } from '@propad/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PaymentsService } from './payments.service';
import { CreatePaymentIntentDto, createPaymentIntentSchema } from './dto/create-payment-intent.dto';
import { MarkProcessingDto, markProcessingSchema } from './dto/processing-intent.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
  };
}

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) { }

  @UseGuards(JwtAuthGuard)
  @Post('intents')
  createIntent(@Body(new ZodValidationPipe(createPaymentIntentSchema)) dto: CreatePaymentIntentDto) {
    return this.paymentsService.createPaymentIntent(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('invoices/for-feature')
  createInvoiceForFeature(
    @Req() req: AuthenticatedRequest,
    @Body() body: { featureType: ChargeableItemType; featureId: string; currency?: Currency }
  ) {
    return this.paymentsService.createInvoiceForFeature(
      body.featureType,
      body.featureId,
      req.user.userId,
      body.currency || Currency.USD
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('invoices/my')
  getMyInvoices(@Req() req: AuthenticatedRequest) {
    return this.paymentsService.listMyInvoices(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('intent/:id/processing')
  markProcessing(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(markProcessingSchema)) _dto: MarkProcessingDto
  ) {
    return this.paymentsService.markIntentProcessing(id);
  }

  @Post('webhook/paynow')
  async paynowWebhook(@Body() body: Record<string, string>) {
    await this.paymentsService.handlePaynowWebhook(body);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('intent/:id/poll')
  async pollPayment(@Param('id') id: string) {
    const result = await this.paymentsService.pollPaymentStatus(id);
    return { success: result };
  }
}
