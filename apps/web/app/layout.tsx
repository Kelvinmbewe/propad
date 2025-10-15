import type { Metadata } from 'next';
import { ReactNode } from 'react';
import './globals.css';
import { ReactQueryProvider } from '@/components/react-query-provider';
import { AuroraThemeProvider, Toaster } from '@propad/ui';
import { AuthProvider } from '@/components/auth-provider';

export const metadata: Metadata = {
  title: 'PropAd Zimbabwe',
  description: 'Zero-fee property marketplace for Zimbabwe'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="aurora-light">
        <AuroraThemeProvider>
          <AuthProvider>
            <ReactQueryProvider>
              {children}
              <Toaster />
            </ReactQueryProvider>
          </AuthProvider>
        </AuroraThemeProvider>
      </body>
    </html>
  );
}
