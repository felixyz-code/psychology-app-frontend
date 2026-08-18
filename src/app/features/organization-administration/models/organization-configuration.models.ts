export type OrganizationConfigurationRowState = 'ABSENT' | 'PRESENT';

export interface OrganizationSettingsResponse {
  rowState: OrganizationConfigurationRowState;
  updatedAt: string | null;
  defaultAppointmentDuration: number;
  persistedDefaultAppointmentDuration: number | null;
}

export interface OrganizationBrandingResponse {
  rowState: OrganizationConfigurationRowState;
  updatedAt: string | null;
  primaryColor: string | null;
}

export type OrganizationSettingsUpdateRequest =
  | { defaultAppointmentDuration: number | null; expectedRowState: 'ABSENT' }
  | { defaultAppointmentDuration: number | null; expectedUpdatedAt: string };

export type OrganizationBrandingUpdateRequest =
  | { primaryColor: string | null; expectedRowState: 'ABSENT' }
  | { primaryColor: string | null; expectedUpdatedAt: string };
