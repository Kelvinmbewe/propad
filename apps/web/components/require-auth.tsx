"use client";
"use client";

import type { ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      const callbackUrl = params.get("callbackUrl") ?? "/dashboard";
      router.replace(
        `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`,
      );
    }
  }, [status, params, router]);

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[color:var(--aurora-color-background)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[color:var(--aurora-color-accent)] border-t-transparent" />
          <p className="text-sm font-medium text-[color:var(--aurora-color-text-subtle)]">
            Verifying access rights...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
