import 'next-auth';
import 'next-auth/jwt';
import type { Role } from '@propad/sdk';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    user: {
      id: string;
      role: Role;
      email?: string | null;
      name?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: Role;
    apiAccessToken?: string;
    userId?: string;
  }
}
