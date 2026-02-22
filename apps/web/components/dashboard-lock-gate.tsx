"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@propad/ui";

const LOCK_KEY = "dashboard:locked-at";
const DEFAULT_IDLE_MS = 30 * 60 * 1000;

function getIdleTimeoutMs() {
  const raw = Number(process.env.NEXT_PUBLIC_DASHBOARD_LOCK_MINUTES ?? 30);
  if (!Number.isFinite(raw) || raw < 5) return DEFAULT_IDLE_MS;
  return raw * 60 * 1000;
}

export function DashboardLockGate({ children }: { children: ReactNode }) {
  const idleTimeoutMs = useMemo(() => getIdleTimeoutMs(), []);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    try {
      const existing = sessionStorage.getItem(LOCK_KEY);
      if (existing) setLocked(true);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (locked) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const arm = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setLocked(true);
        try {
          sessionStorage.setItem(LOCK_KEY, String(Date.now()));
        } catch {
          // ignore
        }
      }, idleTimeoutMs);
    };

    const activityEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
    ] as const;

    for (const eventName of activityEvents) {
      window.addEventListener(eventName, arm, { passive: true });
    }

    arm();

    return () => {
      if (timer) clearTimeout(timer);
      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, arm);
      }
    };
  }, [idleTimeoutMs, locked]);

  if (!locked) return <>{children}</>;

  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-[2px]">
        {children}
      </div>
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/85 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-lg">
          <h2 className="text-xl font-semibold text-foreground">
            Dashboard locked
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            For security, please confirm your password to unlock your dashboard.
          </p>
          <div className="mt-4 flex gap-2">
            <Button
              onClick={() => {
                const callbackUrl =
                  typeof window !== "undefined"
                    ? window.location.pathname + window.location.search
                    : "/dashboard";
                signIn(undefined, { callbackUrl });
              }}
            >
              Unlock with password
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                try {
                  sessionStorage.removeItem(LOCK_KEY);
                } catch {
                  // ignore
                }
                setLocked(false);
              }}
            >
              I&apos;m still here
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
