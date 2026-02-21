import type { Metadata } from "next";
import { ReactNode } from "react";
import { Suspense } from "react";
import "./globals.css";
import { ReactQueryProvider } from "@/components/react-query-provider";
import { AuroraThemeProvider, Toaster } from "@propad/ui";
import { AuthProvider } from "@/components/auth-provider";
import { MessagingOverlay } from "@/features/messaging/components/MessagingOverlay";

export const metadata: Metadata = {
  title: "PropAd Zimbabwe",
  description: "Zero-fee property marketplace for Zimbabwe",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="aurora-light">
        <AuroraThemeProvider>
          <AuthProvider>
            <ReactQueryProvider>
              {children}
              <Suspense fallback={null}>
                <MessagingOverlay />
              </Suspense>
              <Toaster />
            </ReactQueryProvider>
          </AuthProvider>
        </AuroraThemeProvider>
      </body>
    </html>
  );
}
