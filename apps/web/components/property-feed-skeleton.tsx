import { Skeleton } from '@propad/ui';

interface PropertyFeedSkeletonProps {
  cards?: number;
}

export function PropertyFeedSkeleton({ cards = 6 }: PropertyFeedSkeletonProps) {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="order-2 flex flex-col gap-6 lg:order-1">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: cards }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm"
            >
              <Skeleton className="h-48 w-full" />
              <div className="space-y-3 p-4">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="order-1 lg:order-2 lg:pl-4">
        <Skeleton className="h-[320px] w-full rounded-2xl md:h-[420px] lg:h-[520px]" />
      </div>
    </div>
  );
}
