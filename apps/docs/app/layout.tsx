import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../globals.css';
import { AuroraProvider } from '@aurora/ui';
import { DocsToolbar } from '../components/DocsToolbar';
import { RouteTransition } from '../components/RouteTransition';
import React from 'react';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: 'Aurora Theme Framework – Design System',
  description: 'Complete brand, motion, and UI documentation for Aurora.',
  metadataBase: new URL('https://aurora-framework.local'),
  themeColor: '#009688',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <body className={`${inter.variable} bg-slate-50 text-slate-900`}> 
        <AuroraProvider motionEnabled>
          <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-6 pb-16 pt-10 dark:from-slate-900 dark:to-slate-950">
            <DocsToolbar />
            <RouteTransition>{children}</RouteTransition>
          </div>
        </AuroraProvider>
      </body>
    </html>
  );
}
