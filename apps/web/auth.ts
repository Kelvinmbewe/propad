import NextAuth from 'next-auth';
import type { NextAuthConfig } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { env, getServerApiBaseUrl } from '@propad/config';
import type { Role } from '@propad/sdk';

// NOTE: PrismaAdapter REMOVED - we use JWT strategy and authenticate via API calls only.
// The web app should NEVER touch the database directly.

const config: NextAuthConfig = {
  debug: true,
  secret: env.NEXTAUTH_SECRET,
  // NO adapter - using JWT strategy with API-based authentication
  pages: {
    signIn: '/auth/signin'
  },
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(
        credentials: Partial<Record<'email' | 'password', unknown>>
      ) {
        try {
          // Safely narrow types
          const email =
            typeof credentials?.email === 'string'
              ? credentials.email
              : null;

          const password =
            typeof credentials?.password === 'string'
              ? credentials.password
              : null;

          // TEMP LOGS: for debugging (remove later)
          console.log('===========================================');
          console.log('NEXTAUTH CREDENTIALS:', {
            email: email,
            passwordLength: password ? password.length : 0
          });

          if (!email || !password) {
            console.log('[Auth] Missing credentials');
            return null;
          }

          // Call the API for login
          const apiUrl = getServerApiBaseUrl();
          console.log('[Auth] Calling API at:', `${apiUrl}/auth/login`);

          const response = await fetch(`${apiUrl}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email,
              password
            })
          });

          // TEMP LOGS: for debugging (remove later)
          console.log('API LOGIN STATUS:', response.status);
          const responseText = await response.clone().text();
          console.log('API LOGIN BODY:', responseText);
          console.log('===========================================');

          if (!response.ok) {
            console.log('[Auth] API login failed:', response.status, response.statusText);
            return null;
          }

          const data = JSON.parse(responseText);
          console.log('[Auth] API login success, user id:', data.user?.id);

          if (!data.user) {
            console.log('[Auth] No user in API response');
            return null;
          }

          // Return user with tokens attached for JWT callback
          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken
          };
        } catch (error) {
          console.error('[Auth] Authorize error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt' as const
  },
  trustHost: true,
  callbacks: {
    async jwt({ token, user }) {
      try {
        console.log('[Auth] JWT callback called, user:', user?.email);
        const mutableToken = token as Record<string, unknown>;

        if (user) {
          const userData = user as { role?: Role; id?: string; accessToken?: string; refreshToken?: string };
          mutableToken.role = userData.role ?? (mutableToken.role as Role | undefined) ?? 'USER';
          mutableToken.userId = userData.id ?? mutableToken.sub ?? mutableToken.userId;
          // Map tokens from API response
          if (userData.accessToken) {
            mutableToken.apiAccessToken = userData.accessToken;
          }
          if (userData.refreshToken) {
            mutableToken.apiRefreshToken = userData.refreshToken;
          }
        }

        console.log('[Auth] JWT callback success, userId:', mutableToken.userId);
        return mutableToken;
      } catch (error) {
        console.error('[Auth] JWT callback error:', error);
        throw error;
      }
    },
    async session({ session, token }) {
      const tokenData = token as Record<string, unknown>;
      const role: Role = (tokenData.role as Role | undefined) ?? ('USER' as Role);
      const userId =
        (tokenData.sub as string | undefined) ?? (tokenData.userId as string | undefined) ?? '';

      session.user = {
        id: userId,
        role,
        email: session.user?.email ?? undefined,
        name: session.user?.name ?? undefined
      };
      session.accessToken =
        typeof tokenData.apiAccessToken === 'string' ? tokenData.apiAccessToken : undefined;

      return session;
    }
  }
};

const authResult = NextAuth(config);

export const { handlers, auth } = authResult;
export const { GET, POST } = handlers;
