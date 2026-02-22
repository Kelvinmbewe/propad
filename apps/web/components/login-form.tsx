"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@propad/ui";
import { signIn } from "next-auth/react";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const [isSubmitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const ensureNextAuthBaseUrl = () => {
    if (typeof window === "undefined") return;
    const baseUrl = window.location.origin;
    const basePath = "/api/auth";
    const nextAuth = (window as any).__NEXTAUTH ?? {};
    if (!nextAuth.baseUrl) nextAuth.baseUrl = baseUrl;
    if (!nextAuth.basePath) nextAuth.basePath = basePath;
    (window as any).__NEXTAUTH = nextAuth;
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      ensureNextAuthBaseUrl();
      const callbackUrl =
        typeof window !== "undefined" ? `${window.location.origin}/` : "/";
      await signIn("email", {
        email: values.email,
        redirect: true,
        callbackUrl,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>
          Sign in to manage your listings and track verifications.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-2 text-left">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Sending magic link…" : "Send magic link"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            ensureNextAuthBaseUrl();
            signIn("google");
          }}
          className="w-full"
        >
          Continue with Google
        </Button>
      </CardFooter>
    </Card>
  );
}
