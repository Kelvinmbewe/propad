'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

export function AuthProvider({ children }: { children: ReactNode }) {
  // In Docker/production, NEXTAUTH_URL may not be available client-side.
  // Using empty string allows next-auth to use relative URLs (current origin).
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return (
    <SessionProvider basePath="/api/auth" baseUrl={baseUrl}>
      {children}
    </SessionProvider>
  );
}
