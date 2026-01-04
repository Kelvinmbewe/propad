import NextAuth from 'next-auth';
import type { NextAuthConfig } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import EmailProvider from 'next-auth/providers/email';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import { env } from '@propad/config';
import { sign } from 'jsonwebtoken';
import type { Role } from '@propad/sdk';
import { compare } from 'bcryptjs';

const config: NextAuthConfig = {
  debug: true,
  secret: env.NEXTAUTH_SECRET,
  adapter: PrismaAdapter(prisma),
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
      async authorize(credentials) {
        try {
          console.log('[Auth] Authorize called with email:', credentials?.email);

          if (!credentials?.email || !credentials?.password) {
            console.log('[Auth] Missing credentials');
            return null;
          }

          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email as string
            }
          });

          console.log('[Auth] User found:', user ? 'yes' : 'no', user?.email);

          if (!user || !user.passwordHash) {
            console.log('[Auth] No user or no password hash');
            return null;
          }

          const isPasswordValid = await compare(credentials.password as string, user.passwordHash);
          console.log('[Auth] Password valid:', isPasswordValid);

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
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
          const userData = user as { role?: Role; id?: string };
          mutableToken.role = userData.role ?? (mutableToken.role as Role | undefined) ?? 'USER';
          mutableToken.userId = userData.id ?? mutableToken.sub ?? mutableToken.userId;
        }

        const subject = (mutableToken.sub as string | undefined) ?? (mutableToken.userId as string | undefined);
        const role = (mutableToken.role as Role | undefined) ?? 'USER';

        if (subject) {
          mutableToken.apiAccessToken = sign({ sub: subject, role }, env.JWT_SECRET, { expiresIn: '15m' });
        }

        console.log('[Auth] JWT callback success, subject:', subject);
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
        typeof tokenData.apiAccessToken === 'string' ? (tokenData.apiAccessToken) : undefined;

      return session;
    }
  }
};

const authResult = NextAuth(config);

export const { handlers, auth } = authResult;
export const { GET, POST } = handlers;
