'use client';

import React, { useState } from 'react';
import { clsx } from 'clsx';
import { useAurora } from '../../providers/AuroraProvider';

export type TooltipProps = {
  content: React.ReactNode;
  children: React.ReactElement;
  id?: string;
};

export const Tooltip: React.FC<TooltipProps> = ({ content, children, id }) => {
  const { theme, motionEnabled } = useAurora();
  const [visible, setVisible] = useState(false);

  return (
    <span
      className="aurora-tooltip-wrapper"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      style={{ position: 'relative', display: 'inline-flex' }}
    >
      {React.cloneElement(children, { 'aria-describedby': id })}
      <span
        id={id}
        role="tooltip"
        className={clsx('aurora-tooltip', { 'is-visible': visible })}
        style={{
          position: 'absolute',
          bottom: 'calc(100% + 8px)',
          left: '50%',
          transform: `translate(-50%, ${visible && motionEnabled ? '0' : '4px'}) scale(${visible && motionEnabled ? 1 : 0.98})`,
          padding: '8px 12px',
          borderRadius: '8px',
          backgroundColor: theme.name === 'dark' ? 'rgba(15,23,42,0.9)' : '#0F172A',
          color: '#fff',
          pointerEvents: 'none',
          opacity: visible ? 1 : 0,
          transformOrigin: 'bottom center',
          transition: motionEnabled ? 'opacity 120ms ease, transform 120ms ease' : undefined,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        {content}
      </span>
    </span>
  );
};
