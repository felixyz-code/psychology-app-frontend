export type TenantContextState =
  | 'UNINITIALIZED'
  | 'LOADING'
  | 'ACTIVE_TENANT_READY'
  | 'SWITCHING'
  | 'AMBIGUOUS_SELECTION'
  | 'NO_ACTIVE_TENANT'
  | 'ADMIN_SUSPENDED_CONTEXT'
  | 'FORBIDDEN'
  | 'ERROR';

export type AuthContextStatus =
  | 'ACTIVE_TENANT_READY'
  | 'AMBIGUOUS_SELECTION'
  | 'NO_ACTIVE_TENANT'
  | 'ADMIN_SUSPENDED_CONTEXT';

export type TenantOrganizationRole =
  | 'OWNER'
  | 'ADMIN'
  | 'PSYCHOLOGIST'
  | 'RECEPTIONIST'
  | 'BILLING'
  | 'AUDITOR'
  | 'READ_ONLY';

export type TenantResolutionMode = 'EXPLICIT' | 'SINGLE_MEMBERSHIP';

export type TenantCapability =
  | 'appointment.manage'
  | 'appointment.read'
  | 'case_file.create'
  | 'case_file.read'
  | 'case_file.update'
  | 'document.delete'
  | 'document.download'
  | 'document.metadata_read'
  | 'document.update'
  | 'document.upload'
  | 'finance.manage'
  | 'finance.read'
  | 'finance.summary_read'
  | 'invitation.create'
  | 'invitation.read'
  | 'invitation.resend'
  | 'invitation.revoke'
  | 'membership.leave'
  | 'membership.manage_role'
  | 'membership.read'
  | 'membership.reactivate'
  | 'membership.remove'
  | 'membership.suspend'
  | 'organization.manage'
  | 'organization.read'
  | 'ownership.transfer'
  | 'patient.create'
  | 'patient.delete'
  | 'patient.read'
  | 'patient.update'
  | 'report.read'
  | 'session_note.create'
  | 'session_note.delete'
  | 'session_note.read'
  | 'session_note.update'
  | 'workspace.read';

export const TENANT_CAPABILITIES: readonly TenantCapability[] = [
  'appointment.manage',
  'appointment.read',
  'case_file.create',
  'case_file.read',
  'case_file.update',
  'document.delete',
  'document.download',
  'document.metadata_read',
  'document.update',
  'document.upload',
  'finance.manage',
  'finance.read',
  'finance.summary_read',
  'invitation.create',
  'invitation.read',
  'invitation.resend',
  'invitation.revoke',
  'membership.leave',
  'membership.manage_role',
  'membership.read',
  'membership.reactivate',
  'membership.remove',
  'membership.suspend',
  'organization.manage',
  'organization.read',
  'ownership.transfer',
  'patient.create',
  'patient.delete',
  'patient.read',
  'patient.update',
  'report.read',
  'session_note.create',
  'session_note.delete',
  'session_note.read',
  'session_note.update',
  'workspace.read',
];

export interface AuthContextTenant {
  userId: string;
  organizationId: string;
  membershipId: string;
  organizationRole: TenantOrganizationRole;
  resolutionMode: TenantResolutionMode;
}

export interface AuthContextOrganization {
  id: string;
  displayName: string;
  status: 'ACTIVE' | 'SUSPENDED';
}

export interface AuthContextMembership {
  id: string;
  userId: string;
  displayName: string | null;
  email: string;
  role: TenantOrganizationRole;
  status: 'ACTIVE';
  createdAt: string;
  updatedAt: string;
  isCurrentUser: boolean;
}

export interface SelectableMembership {
  membershipId: string;
  organizationId: string;
  organizationDisplayName: string;
  organizationRole: TenantOrganizationRole;
}

export interface AuthContextResponseV1 {
  schemaVersion: 1;
  status: AuthContextStatus;
  tenantContext: AuthContextTenant | null;
  organization: AuthContextOrganization | null;
  membership: AuthContextMembership | null;
  capabilities: string[];
  selectableMemberships: SelectableMembership[];
  preferredOrganizationId: string | null;
}

export interface TenantContextError {
  statusCode: number;
  code: string;
  message: string;
  requestId: string | null;
  details: unknown;
}
