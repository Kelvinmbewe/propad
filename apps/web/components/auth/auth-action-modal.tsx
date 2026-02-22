"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  notify,
} from "@propad/ui";
import { getRequiredPublicApiBaseUrl } from "@/lib/api-base-url";

function toUrl(pathname: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function AuthActionModal() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);

  const open = searchParams.get("authOpen") === "1";
  const returnTo = searchParams.get("returnTo") || pathname || "/dashboard";
  const upgradeToken = searchParams.get("upgradeToken") || "";

  const close = () => {
    const next = new URLSearchParams(searchParams.toString());
    ["authOpen", "returnTo", "upgradeToken", "upgradeRole"].forEach((key) =>
      next.delete(key),
    );
    router.replace(toUrl(pathname, next), { scroll: false });
  };

  const onSignedIn = async () => {
    close();
    const destination = upgradeToken
      ? returnTo.includes("?")
        ? `${returnTo}&upgradeToken=${encodeURIComponent(upgradeToken)}`
        : `${returnTo}?upgradeToken=${encodeURIComponent(upgradeToken)}`
      : returnTo;
    router.push(destination);
  };

  useEffect(() => {
    if (open && status === "authenticated") {
      void onSignedIn();
    }
  }, [open, status]);

  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? close() : null)}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Continue to PropAd</DialogTitle>
          <DialogDescription>
            Sign in or create your account to continue this action.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(value) => setTab(value as any)}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Create account</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form
              className="space-y-3"
              onSubmit={async (event) => {
                event.preventDefault();
                if (busy) return;
                setBusy(true);
                const form = new FormData(event.currentTarget);
                const email = String(form.get("email") || "");
                const password = String(form.get("password") || "");
                const result = await signIn("credentials", {
                  email,
                  password,
                  redirect: false,
                });
                setBusy(false);
                if (!result?.ok) {
                  notify.error("Invalid email or password");
                  return;
                }
                await onSignedIn();
              }}
            >
              <div className="space-y-1">
                <Label htmlFor="auth-signin-email">Email</Label>
                <Input
                  id="auth-signin-email"
                  name="email"
                  type="email"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="auth-signin-password">Password</Label>
                <Input
                  id="auth-signin-password"
                  name="password"
                  type="password"
                  required
                />
              </div>
              <Button className="w-full" disabled={busy}>
                {busy ? "Signing in..." : "Sign in"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() =>
                  signIn("google", {
                    callbackUrl: returnTo,
                  })
                }
              >
                Continue with Google
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form
              className="space-y-3"
              onSubmit={async (event) => {
                event.preventDefault();
                if (busy) return;
                setBusy(true);
                const form = new FormData(event.currentTarget);
                const payload = {
                  name: String(form.get("name") || ""),
                  email: String(form.get("email") || ""),
                  password: String(form.get("password") || ""),
                };
                const response = await fetch(
                  `${getRequiredPublicApiBaseUrl()}/auth/register`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                  },
                );
                if (!response.ok) {
                  setBusy(false);
                  notify.error("Could not create account");
                  return;
                }
                const result = await signIn("credentials", {
                  email: payload.email,
                  password: payload.password,
                  redirect: false,
                });
                setBusy(false);
                if (!result?.ok) {
                  notify.error("Account created, please sign in");
                  setTab("signin");
                  return;
                }
                await onSignedIn();
              }}
            >
              <div className="space-y-1">
                <Label htmlFor="auth-signup-name">Full name</Label>
                <Input id="auth-signup-name" name="name" type="text" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="auth-signup-email">Email</Label>
                <Input
                  id="auth-signup-email"
                  name="email"
                  type="email"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="auth-signup-password">Password</Label>
                <Input
                  id="auth-signup-password"
                  name="password"
                  type="password"
                  minLength={8}
                  required
                />
              </div>
              <Button className="w-full" disabled={busy}>
                {busy ? "Creating account..." : "Create account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
