'use client';

import { createSDK } from '@propad/sdk/browser';
import { env } from '@propad/config';

if (!env.NEXT_PUBLIC_API_BASE_URL) {
  throw new Error('NEXT_PUBLIC_API_BASE_URL must be configured to create the SDK client.');
}

export const api = createSDK({
  baseUrl: env.NEXT_PUBLIC_API_BASE_URL
});
