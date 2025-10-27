'use client';

import { AuroraProvider } from '@aurora/ui';
import React from 'react';

type ProvidersProps = {
  children: React.ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return <AuroraProvider motionEnabled>{children}</AuroraProvider>;
}
