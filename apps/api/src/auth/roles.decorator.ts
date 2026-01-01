import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: any[]) => SetMetadata(ROLES_KEY, roles);
