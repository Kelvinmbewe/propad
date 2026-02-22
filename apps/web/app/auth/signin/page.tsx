"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { Button, Input, Label } from "@propad/ui";
import { Loader2 } from "lucide-react";

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [formState, setFormState] = useState({
    email: "admin@propad.local",
    password: "Admin123!",
    otp: "",
  });



  const getAbsoluteCallbackUrl = () => {
    if (typeof window === "undefined") return "/";
    const params = new URLSearchParams(window.location.search);
    const callbackParam = params.get("callbackUrl");
    if (!callbackParam) return `${window.location.origin}/`;
    try {
      if (callbackParam.startsWith("http")) return callbackParam;
      return new URL(callbackParam, window.location.origin).toString();
    } catch {
      return `${window.location.origin}/`;
    }
  };

  // Ensure next-auth base URL is set on component mount
  // REMOVED manual patching - rely on SessionProvider


  const manualCredentialsSignIn = async () => {
    if (typeof window === "undefined") return;
    const callbackUrl = getAbsoluteCallbackUrl();
    const csrfRes = await fetch(`${window.location.origin}/api/auth/csrf`, {
      headers: { "Content-Type": "application/json" },
    });
    const csrfData = await csrfRes.json();
    const csrfToken = csrfData?.csrfToken;
    if (!csrfToken) {
      throw new Error("Missing CSRF token");
    }

    const formBody = new URLSearchParams();
    formBody.set("csrfToken", csrfToken);
    formBody.set("email", formState.email);
    formBody.set("password", formState.password);
    if (mfaRequired && formState.otp) {
      formBody.set("otp", formState.otp);
    }
    formBody.set("callbackUrl", callbackUrl);
    formBody.set("json", "true");

    const res = await fetch(
      `${window.location.origin}/api/auth/callback/credentials`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formBody.toString(),
      },
    );

    const data = await res.json().catch(() => ({}));
    if (data?.error === "MFA_REQUIRED") {
      setMfaRequired(true);
      setError("Enter your authentication code to continue.");
      setIsLoading(false);
      return;
    }
    if (!res.ok) {
      throw new Error(data?.error || "Unable to sign in");
    }
    const redirectUrl = data?.url || callbackUrl;
    window.location.href = redirectUrl;
  };

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const { email, password, otp } = formState;

    try {

      const callbackUrl = getAbsoluteCallbackUrl();
      const result = await signIn("credentials", {
        email,
        password,
        otp: mfaRequired ? otp : undefined,
        callbackUrl,
        redirect: false,
      });

      if (result?.ok) {
        // Use window.location.href for reliable redirect
        const redirectTo = result.url || callbackUrl || "/";
        window.location.href = redirectTo;
        return;
      }

      if (result?.error === "MFA_REQUIRED") {
        setMfaRequired(true);
        setError("Enter your authentication code to continue.");
        setIsLoading(false);
        return;
      }

      setError(result?.error ? "Invalid credentials" : "Unable to sign in");
      setIsLoading(false);
    } catch (error) {
      console.error("SignIn exception:", error);
      try {
        await manualCredentialsSignIn();
      } catch (fallbackError) {
        console.error("Manual sign-in failed:", fallbackError);
        setError("Unable to reach the authentication server.");
        setIsLoading(false);
      }
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-900 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Sign in to PropAd
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
            Or{" "}
            <a
              href="/auth/signup"
              className="font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
            >
              create a new account
            </a>
          </p>
        </div>

        <div className="mt-8 rounded-lg bg-white px-10 py-8 shadow-xl dark:bg-slate-800">
          <form className="space-y-6" onSubmit={onSubmit}>
            <div>
              <Label htmlFor="email">Email address</Label>
              <div className="mt-1">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formState.email}
                  onChange={(event) =>
                    setFormState({ ...formState, email: event.target.value })
                  }
                  className="block w-full appearance-none rounded-md border border-slate-300 px-3 py-2 placeholder-slate-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="mt-1">
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={formState.password}
                  onChange={(event) =>
                    setFormState({ ...formState, password: event.target.value })
                  }
                  className="block w-full appearance-none rounded-md border border-slate-300 px-3 py-2 placeholder-slate-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                />
              </div>
            </div>

            {mfaRequired && (
              <div>
                <Label htmlFor="otp">
                  {useRecoveryCode ? "Recovery code" : "Authentication code"}
                </Label>
                <div className="mt-1">
                  <Input
                    id="otp"
                    name="otp"
                    type="text"
                    autoComplete="one-time-code"
                    value={formState.otp}
                    onChange={(event) =>
                      setFormState({ ...formState, otp: event.target.value })
                    }
                    className="block w-full appearance-none rounded-md border border-slate-300 px-3 py-2 placeholder-slate-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setUseRecoveryCode((value) => !value)}
                  className="mt-2 text-xs font-medium text-emerald-600 hover:text-emerald-500"
                >
                  {useRecoveryCode
                    ? "Use authenticator code instead"
                    : "Use a recovery code"}
                </button>
              </div>
            )}

            {error && (
              <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/50 dark:text-red-200">
                {error}
              </div>
            )}

            <div>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex w-full justify-center rounded-md border border-transparent bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign in
              </Button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300 dark:border-slate-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3">
              <Button
                variant="outline"
                onClick={() => signIn("google")}
                className="w-full justify-center"
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
