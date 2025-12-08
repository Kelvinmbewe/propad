import NextAuth from 'next-auth';
import type { Role } from '@propad/sdk';

const config = {
  secret: process.env.NEXTAUTH_SECRET ?? 'development-nextauth-secret-development',
  providers: [],
  session: {
    strategy: 'jwt' as const
  },
  callbacks: {
    async session({ session, token }: { session: any; token: Record<string, unknown> }) {
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
};

export const { auth } = NextAuth(config);
