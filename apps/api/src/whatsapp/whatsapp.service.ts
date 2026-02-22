import { Injectable } from '@nestjs/common';
import { Prisma, PropertyType } from '@prisma/client';
import { env } from '@propad/config';
import { PropertiesService } from '../properties/properties.service';
import { ShortLinksService } from '../shortlinks/shortlinks.service';
import { InboundMessageDto } from './dto/inbound-message.dto';

const TYPE_KEYWORDS: Record<string, PropertyType> = {
  room: 'ROOM' as PropertyType,
  rooms: 'ROOM' as PropertyType,
  cottage: 'COTTAGE' as PropertyType,
  cottages: 'COTTAGE' as PropertyType,
  house: 'HOUSE' as PropertyType,
  houses: 'HOUSE' as PropertyType,
  apartment: 'APARTMENT' as PropertyType,
  apartments: 'APARTMENT' as PropertyType,
  flat: 'APARTMENT' as PropertyType,
  flats: 'APARTMENT' as PropertyType,
  townhouse: 'TOWNHOUSE' as PropertyType,
  townhouses: 'TOWNHOUSE' as PropertyType,
  plot: 'PLOT' as PropertyType,
  plots: 'PLOT' as PropertyType,
  land: 'LAND' as PropertyType,
  office: 'COMMERCIAL_OFFICE' as PropertyType,
  offices: 'COMMERCIAL_OFFICE' as PropertyType,
  retail: 'COMMERCIAL_RETAIL' as PropertyType,
  shop: 'COMMERCIAL_RETAIL' as PropertyType,
  industrial: 'COMMERCIAL_INDUSTRIAL' as PropertyType,
  warehouse: 'WAREHOUSE' as PropertyType,
  warehouses: 'WAREHOUSE' as PropertyType,
  farm: 'FARM' as PropertyType,
  farms: 'FARM' as PropertyType,
  mixed: 'MIXED_USE' as PropertyType,
  other: 'OTHER' as PropertyType
};

interface ParsedQuery {
  type?: PropertyType;
  suburb?: string;
  priceMax?: number;
}

@Injectable()
export class WhatsAppService {
  constructor(
    private readonly propertiesService: PropertiesService,
    private readonly shortLinksService: ShortLinksService
  ) { }

  async handleInbound(dto: InboundMessageDto) {
    const parsed = this.parseQuery(dto.message);

    const searchResult = await this.propertiesService.search({
      type: parsed.type,
      priceMax: parsed.priceMax,
      limit: 3
    });

    interface SearchResultProperty {
      id: string;
      city?: { name?: string | null } | null;
      cityName?: string | null;
      suburb?: { name?: string | null } | null;
      suburbName?: string | null;
      type: PropertyType;
      title: string;
      price: number;
      currency: string;
      bedrooms?: number | null;
      bathrooms?: number | null;
      media?: Array<{ url?: string | null }> | null;
    }

    const properties = (searchResult.data as any) as SearchResultProperty[];

    let candidates = properties;
    if (parsed.suburb) {
      const normalized = parsed.suburb.toLowerCase();
      candidates = candidates.filter((property) =>
        (property.suburbName ?? property.suburb?.name ?? property.cityName ?? property.city?.name ?? '')
          .toLowerCase()
          .includes(normalized)
      );
    }

    if (!candidates.length) {
      return {
        reply: `Hi ${dto.from}, we could not find matches right now. Try a different suburb or price range.`,
        items: []
      };
    }

    const items = await Promise.all(
      candidates.map(async (property) => {
        const shortLink = await this.shortLinksService.create({
          targetUrl: `${env.WEB_ORIGIN ?? 'https://propad.local'}/listings/${property.id}`,
          propertyId: property.id,
          utmSource: 'whatsapp',
          utmMedium: 'bot',
          utmCampaign: 'whatsapp-funnel',
          utmTerm: parsed.suburb,
          utmContent: parsed.type
        });

        return {
          id: property.id,
          headline: this.buildHeadline(
            property.cityName ?? property.city?.name ?? 'Unknown',
            property.suburbName ?? property.suburb?.name,
            property.type
          ),
          priceUsd: this.normalizeDecimal(property.price ?? 0),
          bedrooms: property.bedrooms ?? null,
          bathrooms: property.bathrooms ?? null,
          shortLink: `${env.WEB_ORIGIN ?? 'https://propad.local'}/s/${shortLink.code}`,
          previewImage: property.media?.[0]?.url ?? null
        };
      })
    );

    const summaryParts: string[] = [];
    if (parsed.type) {
      summaryParts.push(`${parsed.type.toLowerCase()}s`);
    }
    if (parsed.suburb) {
      summaryParts.push(`in ${parsed.suburb}`);
    }
    if (parsed.priceMax) {
      summaryParts.push(`under $${parsed.priceMax}`);
    }

    const summary = summaryParts.length
      ? summaryParts.join(' ')
      : 'listings we think you will like';

    return {
      reply: `Here are ${items.length} ${summary}. Tap a link to view full details and contact the landlord.`,
      items
    };
  }

  private parseQuery(message: string): ParsedQuery {
    const lower = message.toLowerCase();
    let type: PropertyType | undefined;
    for (const [keyword, mapped] of Object.entries(TYPE_KEYWORDS)) {
      if (lower.includes(keyword)) {
        type = mapped;
        break;
      }
    }

    const priceMatch = lower.match(/(?:under|below|<=|less than)\s*\$?(\d{2,6})/);
    const priceMax = priceMatch ? Number(priceMatch[1]) : undefined;

    const suburbMatch = lower.match(/in ([a-z\s]+)/);
    const suburb = suburbMatch ? suburbMatch[1].split(' under')[0].trim().replace(/[^a-z\s]/g, '') : undefined;

    return { type, suburb: suburb && suburb.length ? suburb : undefined, priceMax };
  }

  private buildHeadline(city: string, suburb: string | null | undefined, type: PropertyType) {
    const location = suburb?.length ? suburb : city;
    return `${this.formatType(type)} in ${location}`;
  }

  private formatType(type: PropertyType) {
    switch (type) {
      case 'ROOM':
        return 'Room';
      case 'COTTAGE':
        return 'Cottage';
      case 'HOUSE':
        return 'House';
      case 'APARTMENT':
        return 'Apartment';
      case 'TOWNHOUSE':
        return 'Townhouse';
      case 'PLOT':
        return 'Plot';
      case 'LAND':
        return 'Land';
      case 'COMMERCIAL_OFFICE':
        return 'Office space';
      case 'COMMERCIAL_RETAIL':
        return 'Retail space';
      case 'COMMERCIAL_INDUSTRIAL':
        return 'Industrial space';
      case 'WAREHOUSE':
        return 'Warehouse';
      case 'FARM':
        return 'Farm property';
      case 'MIXED_USE':
        return 'Mixed-use property';
      case 'OTHER':
        return 'Property';
      default:
        return type;
    }
  }

  private normalizeDecimal(value: Prisma.Decimal | number | string) {
    if (value instanceof Prisma.Decimal) {
      return Number(value.toString());
    }
    if (typeof value === 'string') {
      return Number(value);
    }
    return value;
  }
}
