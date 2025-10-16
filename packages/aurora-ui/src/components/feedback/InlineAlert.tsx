'use client';

import React from 'react';
import { clsx } from 'clsx';
import { useAurora } from '../../providers/AuroraProvider';

export type InlineAlertVariant = 'info' | 'success' | 'warning' | 'danger';

const variantMap: Record<InlineAlertVariant, { icon: string; color: string }> = {
  info: { icon: 'ℹ️', color: '#38BDF8' },
  success: { icon: '✅', color: '#22C55E' },
  warning: { icon: '⚠️', color: '#F59E0B' },
  danger: { icon: '⛔', color: '#EF4444' },
};

export type InlineAlertProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: InlineAlertVariant;
  title?: string;
};

export const InlineAlert: React.FC<InlineAlertProps> = ({ variant = 'info', title, children, className, style, ...rest }) => {
  const { theme } = useAurora();
  const palette = variantMap[variant];
  return (
    <div
      role="status"
      className={clsx('aurora-inline-alert aurora-focus-ring', className)}
      style={{
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
        padding: '12px 16px',
        borderRadius: '12px',
        backgroundColor: theme.name === 'dark' ? 'rgba(15,23,42,0.6)' : 'rgba(226,232,240,0.5)',
        border: `1px solid ${palette.color}40`,
        color: theme.colors.foreground,
        ...style,
      }}
      {...rest}
    >
      <span aria-hidden="true" style={{ fontSize: '1.25rem', lineHeight: 1 }}>
        {palette.icon}
      </span>
      <div>
        {title ? (
          <p style={{ fontWeight: 600, margin: 0, color: palette.color }}>{title}</p>
        ) : null}
        <div style={{ marginTop: title ? 4 : 0 }}>{children}</div>
      </div>
    </div>
  );
};
