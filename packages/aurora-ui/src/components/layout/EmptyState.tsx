'use client';

import React from 'react';
import { useAurora } from '../../providers/AuroraProvider';
import { Button } from './Button';

type EmptyStateVariant = 'no-results' | 'no-favorites' | 'no-permissions';

type EmptyStateProps = {
  variant: EmptyStateVariant;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

const illustrationMap: Record<EmptyStateVariant, string> = {
  'no-results':
    '<svg viewBox="0 0 240 160" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true"><defs><linearGradient id="grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#009688"/><stop offset="100%" stop-color="#2B6CB0"/></linearGradient></defs><rect x="24" y="32" width="192" height="96" rx="18" fill="url(#grad)" opacity="0.18"/><circle cx="96" cy="88" r="32" fill="url(#grad)" opacity="0.35"/><rect x="128" y="72" width="56" height="16" rx="8" fill="#fff" opacity="0.6"/><rect x="72" y="48" width="96" height="12" rx="6" fill="#fff" opacity="0.5"/></svg>',
  'no-favorites':
    '<svg viewBox="0 0 240 160" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true"><defs><linearGradient id="grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#009688"/><stop offset="100%" stop-color="#2B6CB0"/></linearGradient></defs><path d="M120 128 64 88c-24-16-16-56 16-64 16-4 32 4 40 16 8-12 24-20 40-16 32 8 40 48 16 64l-56 40Z" fill="url(#grad)" opacity="0.35"/></svg>',
  'no-permissions':
    '<svg viewBox="0 0 240 160" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true"><defs><linearGradient id="grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#009688"/><stop offset="100%" stop-color="#2B6CB0"/></linearGradient></defs><rect x="52" y="48" width="136" height="80" rx="18" fill="url(#grad)" opacity="0.18"/><path d="M104 104c0-8.8 7.2-16 16-16s16 7.2 16 16v8h16v16H88v-16h16v-8Z" fill="url(#grad)" opacity="0.45"/><rect x="88" y="40" width="64" height="24" rx="12" fill="#fff" opacity="0.7"/></svg>',
};

export const EmptyState: React.FC<EmptyStateProps> = ({ variant, title, description, actionLabel, onAction }) => {
  const { theme } = useAurora();
  return (
    <section
      aria-labelledby={`${variant}-title`}
      style={{
        display: 'grid',
        placeItems: 'center',
        textAlign: 'center',
        gap: 16,
        padding: '32px',
        borderRadius: '24px',
        background: theme.name === 'dark' ? 'rgba(15,23,42,0.6)' : '#ffffff',
        boxShadow: '0 20px 40px rgba(15,23,42,0.08)',
      }}
    >
      <div dangerouslySetInnerHTML={{ __html: illustrationMap[variant] }} />
      <h2 id={`${variant}-title`} style={{ margin: 0, fontSize: '1.5rem' }}>
        {title}
      </h2>
      <p style={{ margin: 0, color: 'rgba(148,163,184,0.9)' }}>{description}</p>
      {actionLabel ? <Button onClick={onAction}>{actionLabel}</Button> : null}
    </section>
  );
};
