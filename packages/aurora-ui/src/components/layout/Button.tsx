'use client';

import React, { useRef } from 'react';
import { clsx } from 'clsx';
import { useAurora } from '../../providers/AuroraProvider';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', className, children, onClick, ...rest }) => {
  const { theme, motionEnabled } = useAurora();
  const rippleRef = useRef<HTMLSpanElement>(null);
  const { type, ...buttonProps } = rest;

  const handleClick = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    if (motionEnabled && rippleRef.current) {
      const ripple = rippleRef.current;
      const rect = (event.currentTarget as HTMLButtonElement).getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
      ripple.classList.remove('is-active');
      void ripple.offsetHeight;
      ripple.classList.add('is-active');
    }
    onClick?.(event);
  };

  const palette = {
    primary: {
      background: 'linear-gradient(135deg, #009688, #2B6CB0)',
      color: '#ffffff',
      border: 'none',
    },
    secondary: {
      background: theme.name === 'dark' ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.08)',
      color: theme.colors.foreground,
      border: '1px solid rgba(148,163,184,0.4)',
    },
    ghost: {
      background: 'transparent',
      color: theme.colors.foreground,
      border: '1px solid transparent',
    },
  }[variant];

  return (
    <button
      type={(type as ButtonProps['type']) ?? 'button'}
      {...buttonProps}
      className={clsx('aurora-button aurora-focus-ring', className)}
      onClick={handleClick}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '9999px',
        padding: '12px 20px',
        fontWeight: 600,
        letterSpacing: '0.02em',
        transition: 'transform 160ms ease, box-shadow 160ms ease',
        transform: motionEnabled ? 'translateZ(0)' : undefined,
        boxShadow: variant === 'primary' ? '0 12px 40px rgba(43,108,176,0.25)' : undefined,
        ...palette,
      }}
    >
      <span>{children}</span>
      <span
        ref={rippleRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          borderRadius: '50%',
          transform: 'scale(0)',
          opacity: 0.35,
          backgroundColor: '#fff',
          pointerEvents: 'none',
        }}
        className="aurora-button__ripple"
      />
      <style>{
        `.aurora-button:hover { box-shadow: 0 16px 42px rgba(43,108,176,0.3); transform: translateY(-1px); }
         .aurora-button__ripple.is-active { animation: aurora-ripple 600ms ease-out forwards; }`
      }</style>
    </button>
  );
};
