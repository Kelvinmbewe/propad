import { Role } from "@propad/config";

export interface SessionActor {
  userId: string;
  role: Role;
}

export function canCreateListing(role: Role) {
  return [Role.LANDLORD, Role.AGENT, Role.COMPANY_ADMIN, Role.ADMIN].includes(
    role,
  );
}

export function canManageListing(
  actor: SessionActor,
  listing: {
    landlordId?: string | null;
    agentOwnerId?: string | null;
    ownerId?: string | null;
    assignedAgentId?: string | null;
    createdById?: string | null;
  },
) {
  if (actor.role === Role.ADMIN) return true;
  return [
    listing.landlordId,
    listing.agentOwnerId,
    listing.ownerId,
    listing.assignedAgentId,
    listing.createdById,
  ].includes(actor.userId);
}
