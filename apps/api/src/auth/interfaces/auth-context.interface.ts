import { Role } from '@propad/config';

export interface AuthContext {
    userId: string;
    role: Role;
    email?: string | null;
}
