import { Request } from 'express';
import { AuthContext } from './auth-context.interface';

export interface AuthenticatedRequest extends Request {
    user: AuthContext;
}
