import * as React from 'react';
import { cn } from '../utils';

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

function Skeleton({ className, ...props }: SkeletonProps) {
  return <div className={cn('animate-pulse rounded-md bg-neutral-200', className)} {...props} />;
}

export { Skeleton };
