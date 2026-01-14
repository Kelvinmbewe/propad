'use client';

import { createSDK } from '@propad/sdk/browser';
import { getRequiredPublicApiBaseUrl } from './api-base-url';

const apiBaseUrl = getRequiredPublicApiBaseUrl();

export const api = createSDK({
  baseUrl: apiBaseUrl
});
