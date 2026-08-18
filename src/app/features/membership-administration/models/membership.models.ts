export type MembershipRole =
  | 'OWNER'
  | 'ADMIN'
  | 'PSYCHOLOGIST'
  | 'RECEPTIONIST'
  | 'BILLING'
  | 'AUDITOR'
  | 'READ_ONLY';

export type AssignableMembershipRole = Exclude<MembershipRole, 'OWNER'>;

export type MembershipStatus = 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED';

export type MembershipAllowedAction = 'CHANGE_ROLE' | 'SUSPEND' | 'REACTIVATE' | 'REMOVE';

export interface MembershipListItem {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  role: MembershipRole;
  status: MembershipStatus;
  joinedAt: string | null;
  suspendedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
  allowedActions: MembershipAllowedAction[];
}

export interface MembershipMutationResponse {
  id: string;
  userId: string;
  role: MembershipRole;
  status: MembershipStatus;
  updatedAt: string;
}

export interface TransferOwnershipDto {
  targetMembershipId: string;
}

export interface OwnershipTransferMembership {
  id: string;
  userId: string;
  role: MembershipRole;
  status: MembershipStatus;
}

export interface OwnershipTransferResponse {
  organizationId: string;
  sourceMembership: OwnershipTransferMembership;
  targetMembership: OwnershipTransferMembership;
  transferredAt: string;
}

export interface ChangeMembershipRoleDto {
  role: AssignableMembershipRole;
  expectedUpdatedAt: string;
}

export interface ChangeMembershipStatusDto {
  status: 'ACTIVE' | 'SUSPENDED';
  expectedUpdatedAt: string;
}

export interface MembershipMutationPreconditionDto {
  expectedUpdatedAt: string;
}

export type MembershipConflictCode =
  | 'CONFLICT'
  | 'CONCURRENT_UPDATE'
  | 'LAST_OWNER_PROTECTED'
  | 'TENANT_CONTEXT_REQUIRED';
