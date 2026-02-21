import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import type { Role } from "@propad/sdk";

const NEXTAUTH_SECRET =
  process.env.NEXTAUTH_SECRET ?? "propad-dev-secret-do-not-use-in-prod";

const config: NextAuthConfig = {
  secret: NEXTAUTH_SECRET,
  providers: [],
  session: {
    strategy: "jwt" as const,
  },
  callbacks: {
    async session({
      session,
      token,
    }: {
      session: any;
      token: Record<string, unknown>;
    }) {
      const role = (token.role as Role | undefined) ?? "USER";
      const userId =
        (token.sub as string | undefined) ??
        (token.userId as string | undefined) ??
        "";

      session.user = {
        id: userId,
        role,
        email: session.user?.email ?? undefined,
        name: session.user?.name ?? undefined,
      };
      session.accessToken =
        typeof token.apiAccessToken === "string"
          ? token.apiAccessToken
          : undefined;

      return session;
    },
  },
  trustHost: true,
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false, // Required for localhost (HTTP, not HTTPS)
      },
    },
  },
};

export const { auth } = NextAuth(config);
