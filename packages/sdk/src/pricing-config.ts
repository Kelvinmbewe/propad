import { createSDK } from "./sdk";

export type PricingConfigClient = ReturnType<typeof createSDK>;

export interface PricingConfigResponse {
  key: string;
  value: unknown;
  enabled?: boolean;
  description?: string | null;
}
