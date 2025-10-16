import { z } from 'zod';

const numericWeight = z.number().min(0).max(1);

export const rankingWeightsSchema = z.object({
  wV: numericWeight,
  wF: numericWeight,
  wD: numericWeight,
  wE: numericWeight,
  wQ: numericWeight,
  wP: numericWeight
});

export const rankingConfigSchema = z.object({
  weights: rankingWeightsSchema,
  tauDays: z.number().positive(),
  discountCap: z.number().min(0).max(1),
  discountCooldownHours: z.number().nonnegative(),
  discountMaxChanges14d: z.number().int().min(0),
  minImpressionsForEngagement: z.number().int().min(0),
  diversity: z.object({
    maxPerAgentPerPage: z.number().int().min(1),
    suburbSpreadTopN: z.number().int().min(1)
  }),
  exposureCap: z.object({
    enabled: z.boolean(),
    minCtrRatio: z.number().min(0)
  })
});

export const lifecycleConfigSchema = z.object({
  graceDaysAfterTaken: z.number().int().min(0),
  archiveAfterDays: z.number().int().min(1),
  allowUnderOfferStep: z.boolean()
});

export const notificationChannelsSchema = z.object({
  email: z.boolean(),
  push: z.boolean(),
  whatsapp: z.boolean(),
  inapp: z.boolean()
});

export const notificationsConfigSchema = z.object({
  channels: notificationChannelsSchema,
  similarCount: z.number().int().min(0),
  sendWindow: z.object({
    startHour: z.number().int().min(0).max(23),
    endHour: z.number().int().min(0).max(23),
    timezone: z.string().min(1)
  }).refine((value) => value.endHour > value.startHour, {
    message: 'endHour must be greater than startHour',
    path: ['endHour']
  })
});

export const adsConfigSchema = z.object({
  pauseFlightsOnTaken: z.boolean(),
  refreshCreativesOnDiscount: z.boolean()
});

export const uiConfigSchema = z.object({
  map: z.object({
    discountPulseHours: z.number().int().min(0),
    reducedMotionSafe: z.boolean()
  }),
  detail: z.object({
    showPriceHistoryDays: z.number().int().min(1)
  })
});

export const appConfigSchema = z.object({
  ranking: rankingConfigSchema,
  lifecycle: lifecycleConfigSchema,
  notifications: notificationsConfigSchema,
  ads: adsConfigSchema,
  ui: uiConfigSchema
});

export type AppConfig = z.infer<typeof appConfigSchema>;

export const defaultAppConfig: AppConfig = {
  ranking: {
    weights: { wV: 0.25, wF: 0.2, wD: 0.25, wE: 0.2, wQ: 0.1, wP: 0.2 },
    tauDays: 14,
    discountCap: 0.7,
    discountCooldownHours: 48,
    discountMaxChanges14d: 3,
    minImpressionsForEngagement: 50,
    diversity: { maxPerAgentPerPage: 3, suburbSpreadTopN: 20 },
    exposureCap: { enabled: true, minCtrRatio: 1 }
  },
  lifecycle: {
    graceDaysAfterTaken: 3,
    archiveAfterDays: 14,
    allowUnderOfferStep: true
  },
  notifications: {
    channels: { email: true, push: true, whatsapp: true, inapp: true },
    similarCount: 6,
    sendWindow: { startHour: 8, endHour: 20, timezone: 'Africa/Harare' }
  },
  ads: {
    pauseFlightsOnTaken: true,
    refreshCreativesOnDiscount: true
  },
  ui: {
    map: { discountPulseHours: 24, reducedMotionSafe: true },
    detail: { showPriceHistoryDays: 90 }
  }
};

