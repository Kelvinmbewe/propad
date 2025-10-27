'use client';

import { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { createSDK } from '@propad/sdk/browser';
import { env } from '@propad/config';

export function useAuthenticatedSDK() {
  const { data } = useSession();
  const token = data?.accessToken;

  return useMemo(() => {
    if (!token || !env.NEXT_PUBLIC_API_BASE_URL) {
      return null;
    }

    return createSDK({ baseUrl: env.NEXT_PUBLIC_API_BASE_URL, token });
  }, [token]);
}
