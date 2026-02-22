'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-medium transition-colors duration-[var(--motion-duration)] ease-[var(--motion-ease)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-900',
  {
    variants: {
      variant: {
        default: 'bg-neutral-900 text-white',
        secondary: 'bg-neutral-100 text-neutral-900',
        outline: 'bg-transparent text-neutral-700 border-neutral-200',
        success: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        destructive: 'bg-red-100 text-red-800 border-red-200'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
  )
);
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
