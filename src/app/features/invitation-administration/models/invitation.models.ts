import { AssignableMembershipRole } from '../../membership-administration/models/membership.models';

export type InvitationRole = AssignableMembershipRole;
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'REVOKED' | 'EXPIRED';

export interface InvitationListItem {
  id: string;
  email: string;
  role: InvitationRole;
  logicalStatus: InvitationStatus;
  expiresAt: string;
  acceptedAt: string | null;
  rejectedAt: string | null;
  revokedAt: string | null;
  expiredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvitationDto {
  email: string;
  role: InvitationRole;
}
