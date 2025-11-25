import NextAuth from 'next-auth';
import type { NextAuthConfig } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import EmailProvider from 'next-auth/providers/email';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import { env } from '@propad/config';
import { sign } from 'jsonwebtoken';
import type { Role } from '@propad/sdk';

const config: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      server: env.EMAIL_SERVER,
      from: env.EMAIL_FROM
    }),
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET
    })
  ],
  session: {
    strategy: 'jwt' as const
  },
  callbacks: {
    async jwt({ token, user }) {
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

      return mutableToken;
    },
    async session({ session, token }) {
      const tokenData = token as Record<string, unknown>;
      const role = (tokenData.role as Role | undefined) ?? 'USER';
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
