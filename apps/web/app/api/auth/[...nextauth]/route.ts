import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import EmailProvider from 'next-auth/providers/email';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import { env } from '@propad/config';
import { sign } from 'jsonwebtoken';
import type { Role } from '@propad/sdk';

const handler = NextAuth({
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
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as unknown as { role?: Role }).role ?? (token.role as Role) ?? 'USER';
        token.userId = (user as unknown as { id?: string }).id ?? token.sub ?? token.userId;
      }

      const subject = (token.sub as string | undefined) ?? (token.userId as string | undefined);
      const role = (token.role as Role | undefined) ?? 'USER';

      if (subject) {
        token.apiAccessToken = sign({ sub: subject, role }, env.JWT_SECRET, { expiresIn: '15m' });
      }

      return token;
    },
    async session({ session, token }) {
      const role = (token.role as Role | undefined) ?? 'USER';
      const userId = (token.sub as string | undefined) ?? (token.userId as string | undefined) ?? '';

      session.user = {
        id: userId,
        role,
        email: session.user?.email ?? undefined,
        name: session.user?.name ?? undefined
      };
      session.accessToken = typeof token.apiAccessToken === 'string' ? token.apiAccessToken : undefined;

      return session;
    }
  }
});

export { handler as GET, handler as POST };
