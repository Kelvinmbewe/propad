import type { Role } from '@propad/sdk';

const rolePriority: Record<Role, number> = {
  ADMIN: 5,
  VERIFIER: 4,
  MODERATOR: 4,
  COMPANY_ADMIN: 4,
  AGENT: 3,
  COMPANY_AGENT: 3,
  INDEPENDENT_AGENT: 3,
  LANDLORD: 2,
  SELLER: 2,
  ADVERTISER: 2,
  USER: 1,
  TENANT: 1,
  BUYER: 1,
};

export function canAccess(required: Role[], actual?: Role | null) {
  if (!actual) return false;
  const priority = rolePriority[actual];
  return required.some((role) => rolePriority[role] <= priority);
}
