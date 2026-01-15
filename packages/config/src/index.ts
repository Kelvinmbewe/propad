import { z } from 'zod';

const defaultServerEnv = {
  // Defaults for non-sensitive values only
  PORT: 3001,
  VAT_PERCENT: 15,
  WALLET_MIN_PAYOUT_CENTS: 2000,
  WALLET_EARNINGS_COOL_OFF_DAYS: 5,
  WALLET_MAX_PAYOUTS_PER_DAY: 2,
  AGGREGATION_CRON_NIGHTLY: '0 2 * * *',
  AGGREGATION_CRON_INCREMENTAL: '*/15 * * * *',
  CACHE_TTL_METRICS_SECONDS: 120,
  DATA_SEEDED: false,
  WS_ENABLED: true,
  NO_STATIC_METRICS: true,
  NO_DUMMY_LINKS: true,
  CONFIG_HOT_RELOAD: false,
  ADSERVER_ENABLED: false,
  ADSERVER_REWARD_SHARE: 0.2,
  MAP_TILES_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  WS_PROVIDER: 'INTERNAL'
} as const;

const serverSchema = z.object({
  PORT: z.coerce.number().default(defaultServerEnv.PORT),
  WEB_ORIGIN: z.string().optional(),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  NEXTAUTH_SECRET: z.string().min(32),
  EMAIL_SERVER: z.string(),
  EMAIL_FROM: z.string().email(),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  S3_ACCESS_KEY: z.string(),
  S3_SECRET_KEY: z.string(),
  S3_ENDPOINT: z.string().url(),
  S3_BUCKET: z.string().min(1),
  FACEBOOK_PAGE_ID: z.string().optional(),
  FACEBOOK_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  ADSERVER_ENABLED: z.coerce.boolean().default(defaultServerEnv.ADSERVER_ENABLED),
  ADSERVER_REWARD_SHARE: z.coerce.number().min(0).max(1).default(defaultServerEnv.ADSERVER_REWARD_SHARE),
  VAT_PERCENT: z.coerce.number().min(0).max(100).default(defaultServerEnv.VAT_PERCENT),
  VAT_RATE: z.coerce.number().min(0).max(1).optional(),
  PAYNOW_INTEGRATION_ID: z.string().optional(),
  PAYNOW_INTEGRATION_KEY: z.string().optional(),
  PAYNOW_RESULT_URL: z.string().url().optional(),
  PAYNOW_RETURN_URL: z.string().url().optional(),
  PAYMENT_METHOD_BLOCKLIST: z.string().optional(),
  MAP_TILES_URL: z.string().min(1).default(defaultServerEnv.MAP_TILES_URL),
  WS_PROVIDER: z.enum(['INTERNAL', 'PUSHER']).default('INTERNAL'),
  PUSHER_KEY: z.string().optional(),
  PUSHER_CLUSTER: z.string().optional(),
  WALLET_MIN_PAYOUT_CENTS: z.coerce.number().min(0).default(defaultServerEnv.WALLET_MIN_PAYOUT_CENTS),
  WALLET_EARNINGS_COOL_OFF_DAYS: z.coerce.number().min(0).max(30).default(defaultServerEnv.WALLET_EARNINGS_COOL_OFF_DAYS),
  WALLET_MAX_PAYOUTS_PER_DAY: z.coerce.number().min(1).max(10).default(defaultServerEnv.WALLET_MAX_PAYOUTS_PER_DAY),
  AGGREGATION_CRON_NIGHTLY: z.string().default(defaultServerEnv.AGGREGATION_CRON_NIGHTLY),
  AGGREGATION_CRON_INCREMENTAL: z.string().default(defaultServerEnv.AGGREGATION_CRON_INCREMENTAL),
  CACHE_TTL_METRICS_SECONDS: z.coerce.number().min(10).max(3600).default(defaultServerEnv.CACHE_TTL_METRICS_SECONDS),
  DATA_SEEDED: z.coerce.boolean().default(defaultServerEnv.DATA_SEEDED),
  WS_ENABLED: z.coerce.boolean().default(defaultServerEnv.WS_ENABLED),
  NO_STATIC_METRICS: z.coerce.boolean().default(defaultServerEnv.NO_STATIC_METRICS),
  NO_DUMMY_LINKS: z.coerce.boolean().default(defaultServerEnv.NO_DUMMY_LINKS),
  CONFIG_HOT_RELOAD: z.coerce.boolean().default(defaultServerEnv.CONFIG_HOT_RELOAD),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
}).refine(data => {
  if (data.NODE_ENV === 'production') {
    const sensitive = [
      data.JWT_SECRET,
      data.NEXTAUTH_SECRET,
      data.GOOGLE_CLIENT_ID,
      data.GOOGLE_CLIENT_SECRET,
      data.S3_ACCESS_KEY,
      data.S3_SECRET_KEY
    ];
    // Check if any sensitive value contains 'development' (common in dummy defaults)
    const hasDevValue = sensitive.some(val => val.includes('development'));
    return !hasDevValue;
  }
  return true;
}, {
  message: 'Production environment detected but using development secrets! Please update JWT_SECRET, NEXTAUTH_SECRET, and other keys.',
  path: ['NODE_ENV'] // Error attached to NODE_ENV
});

const clientSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().url(),
  NEXT_PUBLIC_ADSENSE_CLIENT_ID: z.string().optional(),
  NEXT_PUBLIC_ADSENSE_FEED_SLOT: z.string().optional(),
  NEXT_PUBLIC_ADSENSE_LISTING_SLOT: z.string().optional(),
  NEXT_PUBLIC_WS_ENABLED: z.coerce.boolean().default(true),
  // Internal API URL for server-side requests (Docker service name)
  INTERNAL_API_BASE_URL: z.string().url().optional()
});

type ServerEnv = z.infer<typeof serverSchema>;
type ClientEnv = z.infer<typeof clientSchema>;

const isBrowser = typeof window !== 'undefined';
const isNextRuntime = Boolean(process.env.NEXT_RUNTIME);
const serverEnv = isBrowser
  ? ({ ...defaultServerEnv } as Partial<ServerEnv>)
  : (isNextRuntime ? serverSchema.partial() : serverSchema).parse({
    ...defaultServerEnv,
    ...process.env
  });
const clientEnv = clientSchema.partial().parse(process.env);

export const env: ServerEnv & Partial<ClientEnv> = {
  ...serverEnv,
  ...clientEnv
};

function normalizeApiBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, '');
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`;
}

/**
 * Get the API base URL for server-side requests.
 * In Docker, server-side requests need to use the internal service name (api:3001)
 * while client-side requests use the public URL (localhost:3001).
 * 
 * This reads process.env directly to ensure runtime env vars are used in Docker.
 */
export function getServerApiBaseUrl(): string {
  // Read directly from process.env at runtime to pick up Docker env vars
  const internalUrl = process.env.INTERNAL_API_BASE_URL;
  const publicUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (internalUrl) {
    return normalizeApiBaseUrl(internalUrl);
  }

  if (publicUrl) {
    return normalizeApiBaseUrl(publicUrl);
  }

  // Fallback for development
  if (process.env.NODE_ENV === 'development') {
    return normalizeApiBaseUrl('http://localhost:3001');
  }

  // In production, this should be configured
  throw new Error('API base URL is not configured. Please set INTERNAL_API_BASE_URL or NEXT_PUBLIC_API_BASE_URL');
}

export * from './enums';
