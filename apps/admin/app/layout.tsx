import type { Metadata } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';
import React from 'react';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Aurora Admin Demo',
  description: 'Operational dashboard built on the Aurora Theme Framework.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
