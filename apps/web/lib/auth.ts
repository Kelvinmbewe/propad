import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { normalizeApiBaseUrl } from "./api-base-url";

const TOKEN_REFRESH_BUFFER_MS = 60 * 1000;

function decodeJwtPayload(token: string): { exp?: number } | null {
  const [, payload] = token.split(".");
  if (!payload) {
    return null;
  }

  try {
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = Buffer.from(padded, "base64").toString("utf-8");
    return JSON.parse(decoded) as { exp?: number };
  } catch {
    return null;
  }
}

async function refreshAccessToken(refreshToken: string) {
  const rawApiUrl =
    process.env.INTERNAL_API_BASE_URL ||
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://api:3001/v1";
  const apiUrl = normalizeApiBaseUrl(rawApiUrl);

  const response = await fetch(`${apiUrl}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt" },

  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "MFA Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const rawApiUrl =
          process.env.INTERNAL_API_BASE_URL ||
          process.env.API_URL ||
          process.env.NEXT_PUBLIC_API_URL ||
          process.env.NEXT_PUBLIC_API_BASE_URL ||
          "http://api:3001/v1";
        const apiUrl = normalizeApiBaseUrl(rawApiUrl);
        console.log("[AUTH] Attempting login with API URL:", apiUrl);
        const res = await fetch(`${apiUrl}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
            otp: (credentials as any).otp,
          }),
        });

        if (!res.ok) {
          const errorBody = await res.text();
          try {
            const parsed = JSON.parse(errorBody);
            if (parsed?.mfaRequired) {
              throw new Error("MFA_REQUIRED");
            }
          } catch (error) {
            if (error instanceof Error && error.message === "MFA_REQUIRED") {
              throw error;
            }
          }
          return null;
        }
        const data = await res.json();

        return {
          id: String(data.user.id),
          email: data.user.email,
          name: data.user.name ?? "",
          role: data.user.role,
          mfaEnabled: data.user.mfaEnabled,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        Object.assign(token, user);
        const accessToken = (user as any).accessToken as string | undefined;
        if (accessToken) {
          const payload = decodeJwtPayload(accessToken);
          token.accessTokenExpires = payload?.exp
            ? payload.exp * 1000
            : undefined;
        }
        if (typeof (user as any).mfaEnabled === "boolean") {
          (token as any).mfaEnabled = (user as any).mfaEnabled;
        }
        return token;
      }

      const accessToken = token.accessToken as string | undefined;
      const refreshToken = token.refreshToken as string | undefined;
      const expiresAt = token.accessTokenExpires as number | undefined;

      if (!accessToken || !refreshToken) {
        return token;
      }

      const shouldRefresh =
        !expiresAt || Date.now() + TOKEN_REFRESH_BUFFER_MS >= expiresAt;

      if (!shouldRefresh) {
        return token;
      }

      const refreshed = await refreshAccessToken(refreshToken);
      if (!refreshed?.accessToken) {
        return token;
      }

      const payload = decodeJwtPayload(refreshed.accessToken);
      return {
        ...token,
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken ?? refreshToken,
        accessTokenExpires: payload?.exp
          ? payload.exp * 1000
          : token.accessTokenExpires,
      };
    },

    async session({ session, token }) {
      session.user = {
        id: typeof token.sub === "string" ? token.sub : (token as any).id ?? "",
        email: (token as any).email ?? session.user?.email ?? undefined,
        name: (token as any).name ?? session.user?.name ?? undefined,
        role: (token as any).role ?? (session.user as any)?.role,
      } as any;
      (session.user as any).mfaEnabled = (token as any).mfaEnabled;
      session.accessToken =
        typeof (token as any).accessToken === "string"
          ? (token as any).accessToken
          : undefined;
      return session;
    },
  },

  pages: {
    signIn: "/auth/signin",
  },
});
