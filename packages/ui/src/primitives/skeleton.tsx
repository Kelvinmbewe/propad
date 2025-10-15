import * as React from 'react';
import { cn } from '../utils';

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('skeleton-shimmer relative overflow-hidden rounded-md bg-neutral-200/80', className)}
      {...props}
    />
  );
}

export { Skeleton };
