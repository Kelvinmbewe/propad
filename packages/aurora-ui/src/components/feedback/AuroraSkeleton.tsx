'use client';

import React from 'react';
import { useAurora } from '../../providers/AuroraProvider';
import { clsx } from 'clsx';

export type AuroraSkeletonVariant = 'card' | 'tableRow' | 'form';

export type AuroraSkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: AuroraSkeletonVariant;
};

const baseStyle: React.CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  borderRadius: 'var(--aurora-radius, 12px)',
};

const variantStyles: Record<AuroraSkeletonVariant, string> = {
  card: 'h-48 rounded-2xl',
  tableRow: 'h-12 rounded-xl',
  form: 'h-10 rounded-lg',
};

export const AuroraSkeleton: React.FC<AuroraSkeletonProps> = ({ variant = 'card', className, style, ...rest }) => {
  const { theme, motionEnabled } = useAurora();
  return (
    <div
      className={clsx('aurora-skeleton', variantStyles[variant], className)}
      style={{
        ...baseStyle,
        backgroundColor: theme.name === 'dark' ? 'rgba(148, 163, 184, 0.1)' : 'rgba(15, 23, 42, 0.08)',
        backgroundImage:
          'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0) 100%)',
        backgroundSize: '200% 100%',
        animation: motionEnabled ? 'aurora-shimmer 1.2s linear infinite' : undefined,
        ...style,
      }}
      {...rest}
    />
  );
};
