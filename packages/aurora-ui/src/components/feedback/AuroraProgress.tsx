'use client';

import React from 'react';
import { clsx } from 'clsx';
import { useAurora } from '../../providers/AuroraProvider';

export type AuroraProgressProps = React.HTMLAttributes<HTMLDivElement> & {
  value?: number;
  indeterminate?: boolean;
};

export const AuroraProgress: React.FC<AuroraProgressProps> = ({ value = 0, indeterminate, className, style, ...rest }) => {
  const { theme, motionEnabled } = useAurora();
  const percentage = Math.max(0, Math.min(100, value));

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : percentage}
      className={clsx('aurora-progress', className)}
      style={{
        height: '12px',
        borderRadius: '9999px',
        backgroundColor: theme.name === 'dark' ? 'rgba(148,163,184,0.18)' : 'rgba(15,23,42,0.1)',
        overflow: 'hidden',
        ...style,
      }}
      {...rest}
    >
      <div
        style={{
          height: '100%',
          width: indeterminate ? '40%' : `${percentage}%`,
          backgroundImage: 'linear-gradient(135deg, #009688, #2B6CB0)',
          borderRadius: 'inherit',
          animation: indeterminate && motionEnabled ? 'aurora-progress 1.2s ease-in-out infinite' : undefined,
          transform: indeterminate ? undefined : 'none',
        }}
      />
      <style>{
        `@keyframes aurora-progress { 0% { margin-left: -40%; } 50% { margin-left: 20%; } 100% { margin-left: 100%; } }`
      }</style>
    </div>
  );
};
