'use client';

import { createSDK } from '@propad/sdk/browser';

// Read directly from process.env so Next.js can inline the value at build time
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!apiBaseUrl) {
  throw new Error('NEXT_PUBLIC_API_BASE_URL must be configured to create the SDK client.');
}

export const api = createSDK({
  baseUrl: apiBaseUrl
});
