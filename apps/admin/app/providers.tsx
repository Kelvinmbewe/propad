'use client';

import { AuroraProvider } from '@aurora/ui';
import React from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  return <AuroraProvider>{children}</AuroraProvider>;
}
