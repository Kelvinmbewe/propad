import { randomUUID } from 'crypto';
import type { ShortLink } from '@propad/sdk';

const shortLinksByCode = new Map<string, ShortLink>();

const CODE_LENGTH = 8;

const generateCode = () => {
  let code = '';
  while (code.length < CODE_LENGTH) {
    code += Math.random().toString(36).slice(2);
  }
  return code.slice(0, CODE_LENGTH);
};

export const createShortLink = (targetUrl: string, propertyId: string | null) => {
  let code = generateCode();
  while (shortLinksByCode.has(code)) {
    code = generateCode();
  }

  const shortLink: ShortLink = {
    id: randomUUID(),
    code,
    targetUrl,
    propertyId,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmTerm: null,
    utmContent: null,
    clicks: 0,
    createdAt: new Date().toISOString()
  };

  shortLinksByCode.set(code, shortLink);
  return shortLink;
};

export const getShortLink = (code: string) => shortLinksByCode.get(code) ?? null;

export const recordShortLinkClick = (code: string) => {
  const shortLink = shortLinksByCode.get(code);
  if (!shortLink) {
    return null;
  }

  const updated: ShortLink = { ...shortLink, clicks: shortLink.clicks + 1 };
  shortLinksByCode.set(code, updated);
  return updated;
};
