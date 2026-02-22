"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

function toUrl(pathname: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function useAuthAction() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { status } = useSession();

  const requireAuth = (payload: {
    returnTo: string;
    upgradeToken?: string;
    onAuthed?: () => void;
  }) => {
    if (status === "authenticated") {
      payload.onAuthed?.();
      router.push(payload.returnTo);
      return;
    }

    const next = new URLSearchParams(searchParams.toString());
    next.set("authOpen", "1");
    next.set("returnTo", payload.returnTo);
    if (payload.upgradeToken) {
      next.set("upgradeToken", payload.upgradeToken);
    }

    router.replace(toUrl(pathname, next), { scroll: false });
  };

  return { requireAuth };
}
