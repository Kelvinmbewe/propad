'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button, notify } from '@propad/ui';

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    notify.error('Something went wrong. Please try again.');
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-100 px-4 py-16 text-center">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">500 error</p>
        <h1 className="text-3xl font-semibold text-neutral-900">We hit a snag</h1>
        <p className="max-w-md text-neutral-600">
          Our team has been notified. You can refresh the page or head back to the homepage while we fix the issue.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={() => reset()}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/">Go to homepage</Link>
        </Button>
      </div>
    </main>
  );
}
