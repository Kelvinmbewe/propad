import { z } from 'zod';

const defaultServerEnv = {
  DATABASE_URL: 'postgresql://propad:propad@localhost:5432/propad?schema=public',
  REDIS_URL: 'redis://localhost:6379/0',
  JWT_SECRET: 'development-jwt-secret-development-jwt-secret',
  NEXTAUTH_SECRET: 'development-nextauth-secret-development',
  EMAIL_SERVER: 'smtp://user:pass@smtp.example.com:587',
  EMAIL_FROM: 'noreply@example.com',
  GOOGLE_CLIENT_ID: 'development-google-client-id',
  GOOGLE_CLIENT_SECRET: 'development-google-client-secret',
  S3_ACCESS_KEY: 'development-s3-access-key',
  S3_SECRET_KEY: 'development-s3-secret-key',
  S3_ENDPOINT: 'https://s3.example.com',
  S3_BUCKET: 'development-bucket'
} as const;

const serverSchema = z.object({
  PORT: z.coerce.number().default(3001),
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
  ADSERVER_ENABLED: z.coerce.boolean().default(false),
  ADSERVER_REWARD_SHARE: z.coerce.number().min(0).max(1).default(0.2),
  VAT_PERCENT: z.coerce.number().min(0).max(100).default(15),
  VAT_RATE: z.coerce.number().min(0).max(1).optional(),
  PAYNOW_INTEGRATION_ID: z.string().optional(),
  PAYNOW_INTEGRATION_KEY: z.string().optional(),
  PAYNOW_RESULT_URL: z.string().url().optional(),
  PAYNOW_RETURN_URL: z.string().url().optional(),
  PAYMENT_METHOD_BLOCKLIST: z.string().optional(),
  MAP_TILES_URL: z.string().min(1).default('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
  WS_PROVIDER: z.enum(['INTERNAL', 'PUSHER']).default('INTERNAL'),
  PUSHER_KEY: z.string().optional(),
  PUSHER_CLUSTER: z.string().optional(),
  WALLET_MIN_PAYOUT_CENTS: z.coerce.number().min(0).default(2000),
  WALLET_EARNINGS_COOL_OFF_DAYS: z.coerce.number().min(0).max(30).default(5),
  WALLET_MAX_PAYOUTS_PER_DAY: z.coerce.number().min(1).max(10).default(2),
  AGGREGATION_CRON_NIGHTLY: z.string().default('0 2 * * *'),
  AGGREGATION_CRON_INCREMENTAL: z.string().default('*/15 * * * *'),
  CACHE_TTL_METRICS_SECONDS: z.coerce.number().min(10).max(3600).default(120),
  DATA_SEEDED: z.coerce.boolean().default(false),
  WS_ENABLED: z.coerce.boolean().default(true),
  NO_STATIC_METRICS: z.coerce.boolean().default(true),
  NO_DUMMY_LINKS: z.coerce.boolean().default(true),
  CONFIG_HOT_RELOAD: z.coerce.boolean().default(false)
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

const serverEnv = serverSchema.parse({ ...defaultServerEnv, ...process.env });
const clientEnv = clientSchema.partial().parse(process.env);

export const env: ServerEnv & Partial<ClientEnv> = {
  ...serverEnv,
  ...clientEnv
};

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
    return internalUrl;
  }

  if (publicUrl) {
    return publicUrl;
  }

  // Fallback for development
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3001';
  }

  // In production, this should be configured
  throw new Error('API base URL is not configured. Please set INTERNAL_API_BASE_URL or NEXT_PUBLIC_API_BASE_URL');
}

export * from './enums';
