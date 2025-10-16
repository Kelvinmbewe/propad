'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useAurora } from '../../providers/AuroraProvider';

export type AuroraLogoProps = {
  variant?: 'mark' | 'logotype' | 'full';
  monochrome?: boolean;
  animated?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

const gradientStops = [
  { offset: '0%', color: '#009688' },
  { offset: '100%', color: '#2B6CB0' },
];

export const AuroraLogo: React.FC<AuroraLogoProps> = ({
  variant = 'full',
  monochrome = false,
  animated = true,
  className,
  style,
}) => {
  const { theme, motionEnabled } = useAurora();
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = animated && motionEnabled && !prefersReducedMotion;
  const gradientId = React.useId();
  const maskId = React.useId();

  const gradient = (
    <linearGradient id={gradientId} gradientTransform="rotate(135)" x1="0%" y1="0%" x2="100%" y2="0%">
      {gradientStops.map((stop) => (
        <motion.stop
          key={stop.offset}
          offset={stop.offset}
          stopColor={monochrome ? (theme.name === 'dark' ? theme.colors.textPrimary : theme.colors.textPrimary) : stop.color}
          animate={shouldAnimate ? { stopColor: [stop.color, stop.offset === '0%' ? '#00A79D' : '#3573D8', stop.color] } : undefined}
          transition={{ duration: 1.2, repeat: shouldAnimate ? Infinity : 0, ease: 'easeInOut' }}
        />
      ))}
    </linearGradient>
  );

  const strokeProps = shouldAnimate
    ? {
        initial: { strokeDashoffset: 320, pathLength: 0 },
        animate: { strokeDashoffset: 0, pathLength: 1 },
        transition: { duration: 1.2, ease: 'easeInOut' },
      }
    : {
        strokeDashoffset: 0,
      };

  const fillColor = monochrome ? theme.colors.textPrimary : `url(#${gradientId})`;

  const mark = (
    <svg viewBox="0 0 256 256" role="img" aria-label="Aurora logomark" className={className} style={style}>
      <defs>
        {gradient}
        <mask id={maskId} maskUnits="userSpaceOnUse">
          <rect x="16" y="16" width="224" height="224" rx="26.88" fill="white" />
        </mask>
      </defs>
      <rect x="16" y="16" width="224" height="224" rx="26.88" fill={fillColor} />
      <motion.path
        d="M56 120c28-32 60-48 96-48s68 16 96 48c-24 32-44 44-96 32s-72 0-96-32Z"
        fill={monochrome ? theme.colors.textInverse : 'rgba(255,255,255,0.24)'}
        stroke={monochrome ? theme.colors.textInverse : 'rgba(255,255,255,0.6)'}
        strokeWidth={shouldAnimate ? 2 : 0}
        strokeDasharray="320"
        mask={`url(#${maskId})`}
        {...strokeProps}
      />
      <motion.path
        d="M48 160c24-32 48-48 80-48s56 16 80 48-32 64-80 48-96-16-80-48Z"
        fill={monochrome ? theme.colors.textInverse : 'rgba(255,255,255,0.16)'}
        stroke={monochrome ? theme.colors.textInverse : 'rgba(255,255,255,0.5)'}
        strokeWidth={shouldAnimate ? 2 : 0}
        strokeDasharray="320"
        mask={`url(#${maskId})`}
        {...strokeProps}
      />
    </svg>
  );

  if (variant === 'mark') return mark;

  if (variant === 'logotype') {
    return (
      <svg viewBox="0 0 640 160" role="img" aria-label="Aurora logotype" className={className} style={style}>
        <defs>{gradient}</defs>
        <text
          x="160"
          y="96"
          fontFamily="'Inter', 'Inter var', -apple-system, 'Segoe UI', sans-serif"
          fontWeight={600}
          fontSize={96}
          letterSpacing="0.02em"
          fill={monochrome ? theme.colors.textPrimary : theme.colors.foreground}
        >
          Aurora
        </text>
        <rect x="160" y="112" width="320" height="12" rx="6" fill={fillColor} />
      </svg>
    );
  }

  return (
    <div className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: '1.5rem', ...style }}>
      {mark}
      <svg viewBox="0 0 320 120" role="presentation" style={{ width: '240px', height: '120px' }}>
        <defs>{gradient}</defs>
        <motion.text
          x="0"
          y="80"
          fontFamily="'Inter', 'Inter var', -apple-system, 'Segoe UI', sans-serif"
          fontWeight={600}
          fontSize={96}
          letterSpacing="0.02em"
          fill={monochrome ? theme.colors.textPrimary : theme.colors.foreground}
          {...strokeProps}
        >
          Aurora
        </motion.text>
        <rect x="0" y="96" width="240" height="8" rx="4" fill={fillColor} />
      </svg>
    </div>
  );
};
