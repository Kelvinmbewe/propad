'use client';

import { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { createSDK } from '@propad/sdk/browser';
import { getPublicApiBaseUrl } from '@/lib/api-base-url';

export function useAuthenticatedSDK() {
  const { data } = useSession();
  const token = data?.accessToken;
  const apiBaseUrl = getPublicApiBaseUrl();

  return useMemo(() => {
    if (!token || !apiBaseUrl) {
      return null;
    }

    return createSDK({ baseUrl: apiBaseUrl, token });
  }, [apiBaseUrl, token]);
}
