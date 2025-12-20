import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PropertiesService } from './properties.service';

@Injectable()
export class OfferAutoConfirmationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OfferAutoConfirmationService.name);
  private intervalId: NodeJS.Timeout | null = null;

  constructor(private readonly propertiesService: PropertiesService) {}

  onModuleInit() {
    // Run every 6 hours (4 times per day)
    const intervalMs = 6 * 60 * 60 * 1000;
    
    // Run immediately on startup, then on interval
    this.runAutoConfirmation();
    
    this.intervalId = setInterval(() => {
      this.runAutoConfirmation();
    }, intervalMs);

    if (this.intervalId && typeof this.intervalId.unref === 'function') {
      this.intervalId.unref();
    }

    this.logger.log(`Offer auto-confirmation scheduled (interval=${intervalMs}ms)`);
  }

  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async runAutoConfirmation() {
    try {
      this.logger.log('Running auto-confirmation for old accepted offers...');
      await this.propertiesService.autoConfirmOldOffers();
    } catch (error) {
      this.logger.error('Error in offer auto-confirmation:', error);
    }
  }
}

