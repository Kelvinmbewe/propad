'use client';

import { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { createSDK } from '@propad/sdk/browser';

export type SdkClientStatus =
  | 'loading'
  | 'ready'
  | 'unauthenticated'
  | 'missing-token'
  | 'missing-base-url';

interface SdkClientState {
  sdk: ReturnType<typeof createSDK> | null;
  status: SdkClientStatus;
  message: string | null;
  apiBaseUrl: string | null;
  accessToken: string | null;
}

const STATUS_MESSAGES: Record<Exclude<SdkClientStatus, 'ready' | 'loading'>, string> = {
  unauthenticated: 'Please sign in to continue.',
  'missing-token': 'Your session is missing an access token. Please sign in again.',
  'missing-base-url': 'The API base URL is not configured. Set NEXT_PUBLIC_API_BASE_URL.'
};

export function useSdkClient(): SdkClientState {
  const { data, status } = useSession();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? null;
  const accessToken = data?.accessToken ?? null;

  const sdk = useMemo(() => {
    if (!apiBaseUrl || !accessToken) {
      return null;
    }
    return createSDK({ baseUrl: apiBaseUrl, token: accessToken });
  }, [apiBaseUrl, accessToken]);

  if (status === 'loading') {
    return {
      sdk: null,
      status: 'loading',
      message: null,
      apiBaseUrl,
      accessToken
    };
  }

  if (!apiBaseUrl) {
    return {
      sdk: null,
      status: 'missing-base-url',
      message: STATUS_MESSAGES['missing-base-url'],
      apiBaseUrl,
      accessToken
    };
  }

  if (status === 'unauthenticated') {
    return {
      sdk: null,
      status: 'unauthenticated',
      message: STATUS_MESSAGES.unauthenticated,
      apiBaseUrl,
      accessToken
    };
  }

  if (!accessToken) {
    return {
      sdk: null,
      status: 'missing-token',
      message: STATUS_MESSAGES['missing-token'],
      apiBaseUrl,
      accessToken
    };
  }

  return {
    sdk,
    status: 'ready',
    message: null,
    apiBaseUrl,
    accessToken
  };
}
