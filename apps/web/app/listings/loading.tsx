import { PropertyFeedSkeleton } from '@/components/property-feed-skeleton';

export default function ListingsLoading() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12">
      <div className="text-center">
        <div className="mx-auto h-8 w-2/3 max-w-lg animate-pulse rounded-full bg-neutral-200" />
        <div className="mx-auto mt-4 h-4 w-1/2 max-w-md animate-pulse rounded-full bg-neutral-200" />
      </div>
      <PropertyFeedSkeleton cards={9} />
    </main>
  );
}
