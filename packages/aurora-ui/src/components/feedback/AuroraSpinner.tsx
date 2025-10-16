'use client';

import React from 'react';
import { clsx } from 'clsx';
import { useAurora } from '../../providers/AuroraProvider';

export type AuroraSpinnerProps = React.SVGAttributes<SVGSVGElement> & {
  size?: number;
};

export const AuroraSpinner: React.FC<AuroraSpinnerProps> = ({ size = 48, className, style, ...rest }) => {
  const { motionEnabled } = useAurora();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={clsx('aurora-spinner', className)}
      style={{ filter: 'drop-shadow(0 0 12px rgba(43, 108, 176, 0.45))', ...style }}
      role="status"
      aria-live="polite"
      {...rest}
    >
      <defs>
        <linearGradient id="aurora-spinner-gradient" x1="12" y1="12" x2="52" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#009688" />
          <stop offset="100%" stopColor="#2B6CB0" />
        </linearGradient>
      </defs>
      <circle
        cx="32"
        cy="32"
        r="24"
        stroke="rgba(148, 163, 184, 0.2)"
        strokeWidth="4"
        fill="transparent"
      />
      <circle
        cx="32"
        cy="32"
        r="24"
        stroke="url(#aurora-spinner-gradient)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="120"
        strokeDashoffset="60"
        fill="transparent"
        style={{ animation: motionEnabled ? 'spin 1s ease-in-out infinite' : undefined }}
      />
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </svg>
  );
};
