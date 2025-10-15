'use client';

import type { ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      const callbackUrl = params.get('callbackUrl') ?? '/dashboard';
      router.replace(`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
  }, [status, params, router]);

  if (status !== 'authenticated') {
    return <p className="p-8 text-sm text-neutral-500">Checking session…</p>;
  }

  return <>{children}</>;
}
