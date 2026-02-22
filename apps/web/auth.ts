import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { env } from "@propad/config";
import type { Role } from "@propad/sdk";
import { normalizeApiBaseUrl } from "@/lib/api-base-url";

// =================================================================
// HARD DEFAULT ENV FALLBACKS - No .env required for local dev
// =================================================================
const NEXTAUTH_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

const NEXTAUTH_SECRET =
  process.env.NEXTAUTH_SECRET ?? "propad-dev-secret-do-not-use-in-prod";

const API_URL =
  process.env.INTERNAL_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001";

const TOKEN_REFRESH_BUFFER_MS = 60 * 1000;

function decodeJwtPayload(token: string): { exp?: number } | null {
  const [, payload] = token.split(".");
  if (!payload) return null;
  try {
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = Buffer.from(padded, "base64").toString("utf-8");
    return JSON.parse(decoded) as { exp?: number };
  } catch {
    return null;
  }
}

async function refreshAccessToken(refreshToken: string) {
  const apiUrl = normalizeApiBaseUrl(API_URL);
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

// NOTE: PrismaAdapter REMOVED - we use JWT strategy and authenticate via API calls only.
// The web app should NEVER touch the database directly.

const config: NextAuthConfig = {
  debug: true,
  secret: NEXTAUTH_SECRET,
  // NO adapter - using JWT strategy with API-based authentication
  pages: {
    signIn: "/auth/signin",
  },
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "MFA Code", type: "text" },
      },
      async authorize(
        credentials: Partial<Record<"email" | "password", unknown>>,
      ) {
        try {
          // Safely narrow types
          const email =
            typeof credentials?.email === "string" ? credentials.email : null;

          const password =
            typeof credentials?.password === "string"
              ? credentials.password
              : null;
          const otp =
            typeof (credentials as any)?.otp === "string"
              ? (credentials as any).otp
              : undefined;

          // TEMP LOGS: for debugging (remove later)
          console.log("===========================================");
          console.log("NEXTAUTH CREDENTIALS:", {
            email: email,
            passwordLength: password ? password.length : 0,
          });

          if (!email || !password) {
            console.log("[Auth] Missing credentials");
            return null;
          }

          // Call the API for login - use hard fallback API_URL
          console.log("[Auth] Calling API at:", `${API_URL}/auth/login`);

          const response = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email,
              password,
              otp,
            }),
          });

          // TEMP LOGS: for debugging (remove later)
          console.log("API LOGIN STATUS:", response.status);
          const responseText = await response.clone().text();
          console.log("API LOGIN BODY:", responseText);
          console.log("===========================================");

          if (!response.ok) {
            // FAIL LOUDLY IF API IS UNREACHABLE
            console.error(
              "AUTH API FAILED:",
              response.status,
              response.statusText,
            );
            console.error("AUTH API ERROR BODY:", responseText);
            try {
              const parsed = JSON.parse(responseText);
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

          const data = JSON.parse(responseText);
          console.log("[Auth] API login success, user id:", data.user?.id);

          if (!data.user) {
            console.log("[Auth] No user in API response");
            return null;
          }

          // Return user with tokens attached for JWT callback
          // NextAuth requires id to be a string
          return {
            id: String(data.user.id),
            email: data.user.email,
            name: data.user.name,
            role: data.user.role,
            mfaEnabled: data.user.mfaEnabled,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          };
        } catch (error) {
          console.error("[Auth] Authorize error:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt" as const,
  },
  trustHost: true,
  // Lock cookie mode for HTTP (local dev)
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
  callbacks: {
    async jwt({ token, user }) {
      const mutableToken = token as Record<string, unknown>;
      try {
        console.log("[Auth] JWT callback called, user:", user?.email);

        if (!mutableToken.userId && typeof mutableToken.sub === "string") {
          mutableToken.userId = mutableToken.sub;
        }
        if (!mutableToken.role && mutableToken.userRole) {
          mutableToken.role = mutableToken.userRole;
        }

        if (user) {
          const userData = user as {
            role?: Role;
            id?: string;
            accessToken?: string;
            refreshToken?: string;
            mfaEnabled?: boolean;
          };
          mutableToken.role =
            userData.role ?? (mutableToken.role as Role | undefined) ?? "USER";
          mutableToken.userRole = mutableToken.role;
          mutableToken.userId =
            userData.id ?? mutableToken.sub ?? mutableToken.userId;
          // Map tokens from API response
          if (userData.accessToken) {
            mutableToken.apiAccessToken = userData.accessToken;
            const payload = decodeJwtPayload(userData.accessToken);
            if (payload?.exp) {
              mutableToken.apiAccessTokenExpires = payload.exp * 1000;
            }
          }
          if (userData.refreshToken) {
            mutableToken.apiRefreshToken = userData.refreshToken;
          }
          if (typeof userData.mfaEnabled === "boolean") {
            mutableToken.mfaEnabled = userData.mfaEnabled;
          }
          return mutableToken;
        }

        const accessToken = mutableToken.apiAccessToken as string | undefined;
        const refreshToken = mutableToken.apiRefreshToken as string | undefined;
        const expiresAt = mutableToken.apiAccessTokenExpires as
          | number
          | undefined;

        if (!accessToken || !refreshToken) {
          return mutableToken;
        }

        const shouldRefresh =
          !expiresAt || Date.now() + TOKEN_REFRESH_BUFFER_MS >= expiresAt;

        if (!shouldRefresh) {
          return mutableToken;
        }

        const refreshed = await refreshAccessToken(refreshToken);
        if (!refreshed?.accessToken) {
          return mutableToken;
        }

        const payload = decodeJwtPayload(refreshed.accessToken);
        return {
          ...mutableToken,
          role:
            (mutableToken.role as Role | undefined) ??
            (mutableToken.userRole as Role | undefined) ??
            "USER",
          userRole:
            (mutableToken.userRole as Role | undefined) ??
            (mutableToken.role as Role | undefined) ??
            "USER",
          apiAccessToken: refreshed.accessToken,
          apiRefreshToken: refreshed.refreshToken ?? refreshToken,
          apiAccessTokenExpires: payload?.exp
            ? payload.exp * 1000
            : mutableToken.apiAccessTokenExpires,
        };
      } catch (error) {
        console.error("[Auth] JWT callback error:", error);
        return mutableToken;
      }
    },
    async session({ session, token }) {
      const tokenData = token as Record<string, unknown>;
      const role: Role =
        (tokenData.role as Role | undefined) ??
        (tokenData.userRole as Role | undefined) ??
        ("USER" as Role);
      const userId =
        (tokenData.sub as string | undefined) ??
        (tokenData.userId as string | undefined) ??
        "";

      session.user = {
        id: userId,
        role,
        email: session.user?.email ?? undefined,
        name: session.user?.name ?? undefined,
      };
      (session.user as any).mfaEnabled = tokenData.mfaEnabled as
        | boolean
        | undefined;
      session.accessToken =
        typeof tokenData.apiAccessToken === "string"
          ? tokenData.apiAccessToken
          : undefined;

      return session;
    },
  },
};

const { handlers, auth, signIn, signOut } = NextAuth(config);

export const { GET, POST } = handlers;
export { auth, signIn, signOut };
