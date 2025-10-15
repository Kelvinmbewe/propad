import 'next-auth';
import type { Role } from '@propad/sdk';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: Role;
      email?: string | null;
      name?: string | null;
    };
  }
}
