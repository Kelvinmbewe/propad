"use client";
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@propad/ui";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { getRequiredPublicApiBaseUrl } from "@/lib/api-base-url";

export default function SignUpPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountType, setAccountType] = useState("USER");
  const apiBaseUrl = getRequiredPublicApiBaseUrl();
  const showCompanyFields = accountType === "COMPANY_ADMIN";
  const showAgentFields =
    accountType === "AGENT" || accountType === "INDEPENDENT_AGENT";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    const name = formData.get("name") as string;
    const phone = formData.get("phone") as string;
    const companyName = formData.get("companyName") as string;

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          name,
          phone: phone || undefined,
          role: accountType,
          companyName: companyName || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Registration failed");
      }

      router.push("/auth/signin?registered=true");
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-900 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
            Already have an account?{" "}
            <Link
              href="/auth/signin"
              className="font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
            >
              Sign in
            </Link>
          </p>
        </div>

        <div className="mt-8 rounded-lg bg-white px-10 py-8 shadow-xl dark:bg-slate-800">
          <form className="space-y-6" onSubmit={onSubmit}>
            <div>
              <Label htmlFor="accountType">Account type</Label>
              <div className="mt-1">
                <select
                  id="accountType"
                  name="accountType"
                  value={accountType}
                  onChange={(event) => setAccountType(event.target.value)}
                  className="block w-full appearance-none rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500"
                >
                  <option value="USER">Normal User</option>
                  <option value="AGENT">Agent</option>
                  <option value="INDEPENDENT_AGENT">Independent Agent</option>
                  <option value="LANDLORD">Landlord</option>
                  <option value="COMPANY_ADMIN">Company (Agency)</option>
                  <option value="ADVERTISER">Advertiser</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="phone">Phone (optional)</Label>
              <div className="mt-1">
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  className="block w-full appearance-none rounded-md border border-slate-300 px-3 py-2 placeholder-slate-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                />
              </div>
            </div>

            {showCompanyFields && (
              <div>
                <Label htmlFor="companyName">Company name</Label>
                <div className="mt-1">
                  <Input
                    id="companyName"
                    name="companyName"
                    type="text"
                    autoComplete="organization"
                    required
                    className="block w-full appearance-none rounded-md border border-slate-300 px-3 py-2 placeholder-slate-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                  />
                </div>
              </div>
            )}

            {showAgentFields && (
              <div className="rounded-md border border-emerald-100 bg-emerald-50/60 p-3 text-xs text-emerald-700">
                Agents will be asked for license details during verification.
              </div>
            )}
            <div>
              <Label htmlFor="name">Full Name</Label>
              <div className="mt-1">
                <Input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  className="block w-full appearance-none rounded-md border border-slate-300 px-3 py-2 placeholder-slate-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email address</Label>
              <div className="mt-1">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
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
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="block w-full appearance-none rounded-md border border-slate-300 px-3 py-2 placeholder-slate-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="mt-1">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="block w-full appearance-none rounded-md border border-slate-300 px-3 py-2 placeholder-slate-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                />
              </div>
            </div>

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
                Sign up
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
