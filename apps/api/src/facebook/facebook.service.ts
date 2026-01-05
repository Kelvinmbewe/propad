import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { PropertyType } from '@prisma/client';
import { env } from '@propad/config';
import { firstValueFrom } from 'rxjs';
import { PropertiesService } from '../properties/properties.service';
import { ShortLinksService } from '../shortlinks/shortlinks.service';
import { PublishRequestDto } from './dto/publish-request.dto';

@Injectable()
export class FacebookService {
  private readonly logger = new Logger(FacebookService.name);

  constructor(
    private readonly http: HttpService,
    private readonly propertiesService: PropertiesService,
    private readonly shortLinksService: ShortLinksService
  ) {}

  async publish(dto: PublishRequestDto) {
    const property = await this.propertiesService.findById(dto.propertyId);
    const shortLink = await this.shortLinksService.create({
      targetUrl: `${env.WEB_ORIGIN ?? 'https://propad.local'}/listings/${property.id}`,
      propertyId: property.id,
      utmSource: 'facebook',
      utmMedium: dto.medium ?? 'page',
      utmCampaign: 'facebook-autopost',
      utmContent: property.type
    });

    const message = this.composeMessage(property.type, property.city, property.suburb, property.price, shortLink.code);

    if (!env.FACEBOOK_PAGE_ID || !env.FACEBOOK_ACCESS_TOKEN) {
      this.logger.warn('Facebook credentials missing; returning simulated payload');
      return {
        posted: false,
        message,
        shortLink: `${env.WEB_ORIGIN ?? 'https://propad.local'}/s/${shortLink.code}`,
        destinations: this.resolveDestinations(dto)
      };
    }

    const targets = [
      {
        endpoint: `${env.FACEBOOK_PAGE_ID}/feed`,
        medium: dto.medium ?? 'page'
      },
      ...(dto.groupIds?.map((groupId) => ({ endpoint: `${groupId}/feed`, medium: 'group' })) ?? [])
    ];

    const responses = [] as Array<{ endpoint: string; status: string; id?: string }>;

    for (const target of targets) {
      try {
        const response = await firstValueFrom(
          this.http.post(
            `https://graph.facebook.com/v19.0/${target.endpoint}`,
            {
              message,
              link: `${env.WEB_ORIGIN ?? 'https://propad.local'}/s/${shortLink.code}`
            },
            {
              params: {
                access_token: env.FACEBOOK_ACCESS_TOKEN
              }
            }
          )
        );

        responses.push({ endpoint: target.endpoint, status: 'posted', id: response.data.id });
      } catch (error: any) {
        this.logger.error(`Failed to post to ${target.endpoint}`, error?.response?.data ?? error?.message);
        responses.push({ endpoint: target.endpoint, status: 'failed' });
      }
    }

    if (dto.marketplace) {
      this.logger.log('Marketplace posting requested; ensure manual follow-up.');
    }

    return {
      posted: true,
      message,
      shortLink: `${env.WEB_ORIGIN ?? 'https://propad.local'}/s/${shortLink.code}`,
      destinations: responses
    };
  }

  private composeMessage(
    type: PropertyType,
    city: string,
    suburb: string | null | undefined,
    price: any,
    shortCode: string
  ) {
    const location = suburb?.length ? suburb : city;
    const formattedPrice = this.formatPrice(price);
    const typeLabel = this.humanType(type);
    return `${typeLabel} in ${location}\nPrice: ${formattedPrice}\nView more photos & contact: ${env.WEB_ORIGIN ?? 'https://propad.local'}/s/${shortCode}`;
  }

  private humanType(type: PropertyType) {
    switch (type) {
      case 'ROOM':
        return 'Room to rent';
      case 'COTTAGE':
        return 'Cottage available';
      case 'HOUSE':
        return 'House listing';
      case 'APARTMENT':
        return 'Apartment listing';
      case 'TOWNHOUSE':
        return 'Townhouse listing';
      case 'PLOT':
        return 'Plot / stand';
      case 'LAND':
        return 'Land opportunity';
      case 'COMMERCIAL_OFFICE':
        return 'Office space available';
      case 'COMMERCIAL_RETAIL':
        return 'Retail space available';
      case 'COMMERCIAL_INDUSTRIAL':
        return 'Industrial property available';
      case 'WAREHOUSE':
        return 'Warehouse listing';
      case 'FARM':
        return 'Farm property';
      case 'MIXED_USE':
        return 'Mixed-use development';
      case 'OTHER':
        return 'Property listing';
      default:
        return 'Listing';
    }
  }

  private formatPrice(price: any) {
    if (typeof price === 'string') {
      return `$${Number(price).toLocaleString()}`;
    }
    if (typeof price === 'number') {
      return `$${price.toLocaleString()}`;
    }
    if ('toNumber' in price && typeof price.toNumber === 'function') {
      return `$${price.toNumber().toLocaleString()}`;
    }
    return '$--';
  }

  private resolveDestinations(dto: PublishRequestDto) {
    const destinations = [
      { endpoint: 'page', status: 'simulated' }
    ];
    if (dto.groupIds?.length) {
      for (const group of dto.groupIds) {
        destinations.push({ endpoint: group, status: 'simulated' });
      }
    }
    if (dto.marketplace) {
      destinations.push({ endpoint: 'marketplace', status: 'manual' });
    }
    return destinations;
  }
}
