'use client';

import React from 'react';
import { AuroraLogo } from '../logo/AuroraLogo';
import { InlineAlert } from './InlineAlert';
import { useAurora } from '../../providers/AuroraProvider';

export type ErrorBoundaryPageProps = {
  error: Error;
  onRetry?: () => void;
};

export const ErrorBoundaryPage: React.FC<ErrorBoundaryPageProps> = ({ error, onRetry }) => {
  const { theme } = useAurora();
  return (
    <main
      aria-labelledby="aurora-error-title"
      style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--aurora-padding, 32px)',
        background: theme.colors.background,
        color: theme.colors.foreground,
      }}
    >
      <div style={{ maxWidth: 480, textAlign: 'center', display: 'grid', gap: 24 }}>
        <AuroraLogo variant="mark" style={{ width: 96, margin: '0 auto' }} />
        <h1 id="aurora-error-title" style={{ fontSize: '2.5rem', margin: 0 }}>
          Something went aurora-side
        </h1>
        <InlineAlert variant="danger" title="Error details">
          <code>{error.message}</code>
        </InlineAlert>
        <p>If the problem continues please contact support.</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="aurora-focus-ring"
            style={{
              padding: '12px 24px',
              borderRadius: '9999px',
              backgroundImage: 'linear-gradient(135deg, #009688, #2B6CB0)',
              color: '#fff',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        ) : null}
      </div>
    </main>
  );
};
