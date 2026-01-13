'use client';

import Link from 'next/link';
import { AlertTriangle, Loader2, LogIn } from 'lucide-react';
import { Button } from '@propad/ui';
import { EmptyState } from './empty-state';
import type { SdkClientStatus } from '@/hooks/use-sdk-client';

interface ClientStateProps {
  status: SdkClientStatus;
  message?: string | null;
  title?: string;
  actionLabel?: string;
  actionHref?: string;
}

export function ClientState({
  status,
  message,
  title,
  actionLabel,
  actionHref
}: ClientStateProps) {
  if (status === 'ready') {
    return null;
  }

  if (status === 'loading') {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  const heading =
    title ??
    (status === 'unauthenticated'
      ? 'Sign in required'
      : status === 'missing-token'
        ? 'Session refresh needed'
        : 'Configuration missing');

  const description =
    message ??
    (status === 'unauthenticated'
      ? 'Please sign in again to access this dashboard section.'
      : status === 'missing-token'
        ? 'Your session is missing an access token, so we cannot fetch dashboard data.'
        : 'The dashboard API endpoint is not configured yet.');

  const defaultAction =
    status === 'unauthenticated' ? (
      <Link href="/auth/signin">
        <Button variant="outline">
          <LogIn className="mr-2 h-4 w-4" />
          Sign in
        </Button>
      </Link>
    ) : null;

  const customAction = actionLabel && actionHref ? (
    <Link href={actionHref}>
      <Button variant="outline">{actionLabel}</Button>
    </Link>
  ) : null;

  return (
    <EmptyState
      title={heading}
      description={description}
      action={customAction ?? defaultAction ?? <AlertTriangle className="h-5 w-5 text-neutral-400" />}
    />
  );
}
