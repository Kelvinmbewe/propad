import { randomUUID } from 'node:crypto';
import type { AgentSummary, Property, ShortLink } from '@propad/sdk';

export const mockProperties: Property[] = [
  {
    id: 'prop-harare-001',
    type: 'APARTMENT',
    currency: 'USD',
    price: 480,
    city: 'Harare',
    suburb: 'Borrowdale',
    latitude: -17.764,
    longitude: 31.076,
    location: {
      city: 'Harare',
      suburb: 'Borrowdale',
      lat: -17.764,
      lng: 31.076
    },
    bedrooms: 3,
    bathrooms: 2,
    furnishing: 'PARTLY',
    availability: 'DATE',
    availableFrom: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    amenities: ['Solar backup', 'Borehole', 'Parking'],
    description:
      "North-facing garden flat with solar backup, borehole, and secure parking. 2 minutes from Sam Levy's Village.",
    media: [
      {
        id: 'media-001',
        url: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80',
        kind: 'IMAGE',
        hasGps: true
      }
    ],
    commercialFields: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prop-harare-002',
    type: 'TOWNHOUSE',
    currency: 'USD',
    price: 520,
    city: 'Harare',
    suburb: 'Helensvale',
    latitude: -17.741,
    longitude: 31.099,
    location: {
      city: 'Harare',
      suburb: 'Helensvale',
      lat: -17.741,
      lng: 31.099
    },
    bedrooms: 4,
    bathrooms: 3,
    furnishing: 'FULLY',
    availability: 'IMMEDIATE',
    availableFrom: null,
    amenities: ['Pool', 'Fibre internet', '24/7 security'],
    description:
      'Modern townhouse with open-plan kitchen, fibre internet, and a communal pool. Promo boost active for the next 5 days.',
    media: [
      {
        id: 'media-002',
        url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80',
        kind: 'IMAGE',
        hasGps: true
      }
    ],
    commercialFields: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prop-harare-003',
    type: 'COTTAGE',
    currency: 'USD',
    price: 380,
    city: 'Harare',
    suburb: 'Mt Pleasant',
    latitude: -17.779,
    longitude: 31.042,
    location: {
      city: 'Harare',
      suburb: 'Mt Pleasant',
      lat: -17.779,
      lng: 31.042
    },
    bedrooms: 2,
    bathrooms: 1,
    furnishing: 'NONE',
    availability: 'IMMEDIATE',
    availableFrom: null,
    amenities: ['Water storage', 'Prepaid ZESA', 'Security'],
    description:
      'Standalone cottage ideal for professionals. Secure estate with 24/7 guard, prepaid ZESA, and water storage.',
    media: [
      {
        id: 'media-003',
        url: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80',
        kind: 'IMAGE',
        hasGps: false
      }
    ],
    commercialFields: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prop-harare-004',
    type: 'COMMERCIAL_OFFICE',
    currency: 'USD',
    price: 1850,
    city: 'Harare',
    suburb: 'Avondale',
    latitude: -17.789,
    longitude: 31.040,
    location: {
      city: 'Harare',
      suburb: 'Avondale',
      lat: -17.789,
      lng: 31.04
    },
    bedrooms: null,
    bathrooms: 4,
    furnishing: 'NONE',
    availability: 'DATE',
    availableFrom: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    amenities: ['Generator', 'Reception', 'Boardroom'],
    description:
      'Recently refurbished office park with back-up power, fibre internet trunking, and secure access control.',
    media: [
      {
        id: 'media-004',
        url: 'https://images.unsplash.com/photo-1529429617124-aee711a0343c?auto=format&fit=crop&w=800&q=80',
        kind: 'IMAGE',
        hasGps: true
      }
    ],
    commercialFields: {
      floorAreaSqm: 280,
      lotSizeSqm: 1200,
      parkingBays: 8,
      powerPhase: 'THREE',
      loadingBay: false,
      zoning: 'Commercial core',
      complianceDocsUrl: 'https://cdn.propad.co.zw/mock/compliance-office.pdf'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const mockAgents: AgentSummary[] = [
  {
    id: 'agent-001',
    name: 'Tsitsi Moyo',
    phone: '+263771001001',
    agentProfile: {
      verifiedListingsCount: 18,
      leadsCount: 124
    }
  },
  {
    id: 'agent-002',
    name: 'Kudzai Sibanda',
    phone: '+263771001045',
    agentProfile: {
      verifiedListingsCount: 11,
      leadsCount: 96
    }
  },
  {
    id: 'agent-003',
    name: 'Lindiwe Chari',
    phone: '+263772330221',
    agentProfile: {
      verifiedListingsCount: 9,
      leadsCount: 74
    }
  }
];

const shortLinkStore = new Map<string, ShortLink>();

export function createShortLink(targetUrl: string, propertyId?: string | null): ShortLink {
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  const shortLink: ShortLink = {
    id: randomUUID(),
    code,
    targetUrl,
    propertyId: propertyId ?? null,
    utmSource: 'web',
    utmMedium: 'mock',
    utmCampaign: 'demo',
    utmTerm: null,
    utmContent: null,
    clicks: 0,
    createdAt: new Date().toISOString()
  };

  shortLinkStore.set(code, shortLink);
  return shortLink;
}

export function getShortLink(code: string): ShortLink | undefined {
  return shortLinkStore.get(code);
}

export function recordShortLinkClick(code: string) {
  const entry = shortLinkStore.get(code);
  if (entry) {
    entry.clicks += 1;
  }
}
