"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@propad/ui";

export function AuthDialog({
  open,
  onOpenChange,
  callbackUrl,
  onSignedIn,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  callbackUrl: string;
  onSignedIn?: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCredentialsSignIn = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        callbackUrl,
        redirect: false,
      });

      if (result?.ok) {
        onSignedIn?.();
        return;
      }

      setError("Unable to sign in with these credentials.");
    } catch {
      setError("Unable to sign in right now.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Sign in to message</DialogTitle>
          <DialogDescription>
            Continue to start secure conversations in PropAd Messenger.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="message-auth-email">Email</Label>
            <Input
              id="message-auth-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="message-auth-password">Password</Label>
            <Input
              id="message-auth-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button
            className="w-full"
            onClick={onCredentialsSignIn}
            disabled={isLoading || !email || !password}
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => signIn("google", { callbackUrl })}
          >
            Continue with Google
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
