'use client';

import { createSDK } from '@propad/sdk/browser';
import { env } from '@propad/config';

export const api = createSDK({
  baseUrl: env.NEXT_PUBLIC_API_BASE_URL
});
