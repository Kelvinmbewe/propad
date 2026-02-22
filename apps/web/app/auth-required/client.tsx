"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useAuthAction } from "@/hooks/use-auth-action";

export function AuthRequiredClient({
  returnTo,
  upgradeToken,
  authOpen,
}: {
  returnTo: string;
  upgradeToken?: string;
  authOpen: boolean;
}) {
  const { status } = useSession();
  const { requireAuth } = useAuthAction();

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (status !== "authenticated" && authOpen) {
      return;
    }

    requireAuth({ returnTo, upgradeToken });
  }, [authOpen, requireAuth, returnTo, status, upgradeToken]);

  return null;
}
