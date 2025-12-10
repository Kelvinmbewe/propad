'use client';

import { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { createSDK } from '@propad/sdk/browser';

// Access NEXT_PUBLIC_* directly so it's inlined at build time
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export function useAuthenticatedSDK() {
  const { data } = useSession();
  const token = data?.accessToken;

  return useMemo(() => {
    if (!token || !API_BASE_URL) {
      return null;
    }

    return createSDK({ baseUrl: API_BASE_URL, token });
  }, [token]);
}

