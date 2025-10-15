import Link from 'next/link';
import { Button } from '@propad/ui';

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-100 px-4 py-16 text-center">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">404 error</p>
        <h1 className="text-3xl font-semibold text-neutral-900">We can’t find that page</h1>
        <p className="max-w-md text-neutral-600">
          The page you are looking for may have been moved or removed. Check the URL or return to the homepage to continue
          exploring verified listings.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/">Go to homepage</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/listings">Browse listings</Link>
        </Button>
      </div>
    </main>
  );
}
