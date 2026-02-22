"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@propad/ui";
import { getRequiredPublicApiBaseUrl } from "@/lib/api-base-url";
import { useAuthAction } from "@/hooks/use-auth-action";

export const dynamic = "force-dynamic";

const TARGETS = {
  agent: { role: "AGENT", redirectTo: "/dashboard/profile?upgraded=agent" },
  agency: {
    role: "COMPANY_ADMIN",
    redirectTo: "/dashboard/agency/create?upgraded=agency",
  },
  advertiser: {
    role: "ADVERTISER",
    redirectTo: "/dashboard/advertiser?upgraded=advertiser",
  },
  landlord: {
    role: "LANDLORD",
    redirectTo: "/dashboard/listings?upgraded=landlord",
  },
} as const;

type TrackKey = keyof typeof TARGETS;

export default function UpgradeTrackPage() {
  const params = useParams<{ track: string }>();
  const track = params.track as TrackKey;
  const target = TARGETS[track];

  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { requireAuth } = useAuthAction();

  const [state, setState] = useState<"idle" | "working" | "failed">("idle");
  const [error, setError] = useState<string>("");

  const upgradeToken =
    searchParams.get("token") || searchParams.get("upgradeToken") || "";
  const returnTo = useMemo(() => {
    const query = searchParams.toString();
    return query ? `/upgrade/${track}?${query}` : `/upgrade/${track}`;
  }, [searchParams, track]);

  const runUpgrade = useCallback(async () => {
    if (!target) {
      setState("failed");
      setError("Unknown upgrade track.");
      return;
    }

    const accessToken = session?.accessToken;
    if (!accessToken) {
      setState("failed");
      setError("Your session expired. Please sign in again.");
      return;
    }

    setState("working");
    setError("");

    try {
      const endpoint = upgradeToken
        ? "/auth/upgrade/redeem"
        : "/auth/upgrade/self-serve";
      const body = upgradeToken
        ? { token: upgradeToken }
        : { targetRole: target.role };
      const response = await fetch(
        `${getRequiredPublicApiBaseUrl()}${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        const payload = await response.text();
        throw new Error(payload || "Upgrade failed");
      }

      router.replace(target.redirectTo);
    } catch (upgradeError) {
      setState("failed");
      setError(
        upgradeError instanceof Error
          ? upgradeError.message
          : "Upgrade failed. Please try again.",
      );
    }
  }, [router, session?.accessToken, target, upgradeToken]);

  useEffect(() => {
    if (!target) {
      return;
    }

    if (status === "loading") {
      return;
    }

    if (!session?.user?.id) {
      requireAuth({ returnTo, upgradeToken: upgradeToken || undefined });
      return;
    }

    if (!session.accessToken) {
      return;
    }

    if (state === "idle") {
      void runUpgrade();
    }
  }, [
    requireAuth,
    returnTo,
    runUpgrade,
    session?.accessToken,
    session?.user?.id,
    state,
    status,
    target,
    upgradeToken,
  ]);

  if (!target) {
    return (
      <main className="mx-auto max-w-xl px-6 py-24">
        Upgrade path not found.
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-xl flex-col items-start gap-4 px-6 py-24">
      <h1 className="text-2xl font-semibold text-foreground">
        Setting up your account
      </h1>
      <p className="text-sm text-muted-foreground">
        We are applying your {track} upgrade and preparing your dashboard.
      </p>
      {state === "working" ? (
        <p className="text-sm text-muted-foreground">Working...</p>
      ) : null}
      {state === "failed" ? (
        <>
          <p className="text-sm text-red-600">{error}</p>
          <Button onClick={() => void runUpgrade()}>Retry upgrade</Button>
        </>
      ) : null}
    </main>
  );
}
