'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button, notify } from '@propad/ui';

export default function ListingsError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    notify.error('We could not load listings. Please try again.');
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-5xl flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-neutral-900">Listings are unavailable right now</h1>
        <p className="max-w-md text-neutral-600">
          Our marketplace is temporarily unavailable. Please refresh the page or return home while we resolve the issue.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={() => reset()}>Retry</Button>
        <Button asChild variant="outline">
          <Link href="/">Go to homepage</Link>
        </Button>
      </div>
    </main>
  );
}
