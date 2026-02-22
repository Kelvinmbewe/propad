import type { Role } from "@propad/sdk";

export const RBAC = {
  USER: "USER",
  LANDLORD: "LANDLORD",
  AGENT: "AGENT",
  AGENCY: "COMPANY_ADMIN",
  ADVERTISER: "ADVERTISER",
  ADMIN: "ADMIN",
} as const;

export function hasRole(role: Role | undefined, allowed: Role[]) {
  if (!role) return false;
  return allowed.includes(role);
}

export function canCreateListing(role: Role | undefined) {
  if (!role) return false;
  return ["LANDLORD", "AGENT", "COMPANY_ADMIN", "ADMIN"].includes(role);
}

export function canAccessListingsDashboard(input: {
  role?: Role;
  ownedListingsCount?: number;
}) {
  if (canCreateListing(input.role)) return true;
  return (input.ownedListingsCount ?? 0) > 0;
}
